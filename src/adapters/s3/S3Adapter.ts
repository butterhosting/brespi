import { FilterCapability } from "@/capabilities/filter/FilterCapability";
import { ManagedStorageCapability } from "@/capabilities/managedstorage/ManagedStorageCapability";
import { Env } from "@/Env";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { StepWithRuntime } from "@/models/StepWithRuntime";
import { S3Client } from "bun";
import { isAbsolute, join, relative } from "path";
import { AbstractAdapter } from "../AbstractAdapter";
import { AdapterResult } from "../AdapterResult";
import { BrespiS3Client } from "./BrespiS3Client";
import { PropertyResolver } from "@/capabilities/propertyresolution/PropertyResolver";
import { UrlParser } from "@/helpers/UrlParser";
import { Logger } from "@/Logger";

export class S3Adapter extends AbstractAdapter {
  private readonly log = new Logger(__filename);

  public constructor(
    protected readonly env: Env.Private,
    protected readonly propertyResolver: PropertyResolver,
    private readonly managedStorageCapability: ManagedStorageCapability,
    private readonly filterCapability: FilterCapability,
  ) {
    super(env, propertyResolver);
  }

  public async upload(artifacts: Artifact[], { basePrefix, ...step }: Step.S3Upload, trail: StepWithRuntime[]): Promise<AdapterResult> {
    this.requireArtifactType("file", ...artifacts);
    const base = this.relativize(this.resolveString(basePrefix));
    const client = this.constructClient(step.connection);
    const mutexKey = this.mutexKey(base);
    const readWriteFns = this.createReadWriteFns(client);

    this.log.debug(`Preparing to update the storage manifest; bucket=${client.options.bucket}`);
    const { insertableArtifacts } = await this.managedStorageCapability.insert({
      mutexKey,
      artifacts,
      trail,
      base,
      ...readWriteFns,
    });

    this.log.debug(`Preparing to upload artifacts; bucket=${client.options.bucket}, insertableArtifacts.length=${artifacts.length}`);
    for (const { path, destinationPath } of insertableArtifacts) {
      await client.write(destinationPath, Bun.file(path));
    }

    if (step.retention) {
      this.log.debug(`Preparing to update the storage manifest again for removal operations; bucket=${client.options.bucket}`);
      const { removableItems } = await this.managedStorageCapability.clean({
        mutexKey,
        base,
        configuration: step.retention,
        ...readWriteFns,
      });

      this.log.debug(`Preparing to remove artifacts; bucket=${client.options.bucket}, removableItems.length=${removableItems.length}`);
      const removableKeyPrefixes = removableItems.map(({ version }) => join(base, version));
      for (const removableKeyPrefix of removableKeyPrefixes) {
        const keys = await client.listAllKeys({ prefix: removableKeyPrefix });
        await client.deleteAll({ keys });
      }
    }

    this.log.info(`Successfully uploaded artifacts; bucket=${client.options.bucket}, artifacts.length=${artifacts.length}`);
    return AdapterResult.create();
  }

  public async download({ basePrefix, ...step }: Step.S3Download): Promise<AdapterResult> {
    basePrefix = this.relativize(this.resolveString(basePrefix));
    const client = this.constructClient(step.connection);

    this.log.debug(`Selecting version from managed storage; bucket=${client.options.bucket}`);
    // Find artifacts
    let { resolvedVersion, selectableArtifacts } = await this.managedStorageCapability.select({
      mutexKey: this.mutexKey(basePrefix),
      base: basePrefix,
      configuration: step.managedStorage,
      ...this.createReadWriteFns(client),
    });
    // Optional: filter
    if (step.filterCriteria) {
      this.log.debug(`Applying filter criteria; method=${step.filterCriteria.method}`);
      const { predicate } = this.filterCapability.createPredicate(step.filterCriteria);
      selectableArtifacts = selectableArtifacts.filter(predicate);
    }
    // Retrieve artifacts
    this.log.debug(
      `Preparing to download artifacts; bucket=${client.options.bucket}, selectableArtifacts.length=${selectableArtifacts.length}`,
    );
    const artifacts: Artifact[] = [];
    for (const { name, path } of selectableArtifacts) {
      const { outputId, outputPath } = this.generateArtifactDestination();
      await Bun.write(outputPath, client.file(path));
      artifacts.push({
        id: outputId,
        type: "file",
        path: outputPath,
        name,
      });
    }

    this.log.info(
      `Successfully downloaded artifacts; bucket=${client.options.bucket}, version=${resolvedVersion}, artifacts.length=${artifacts.length}`,
    );
    return AdapterResult.create(artifacts, { version: resolvedVersion });
  }

  /**
   * Specifically for S3, we want to make absolute base folders relative
   * For example: `/my-backups` --> `my-backups`
   */
  private relativize(baseFolder: string): string {
    return isAbsolute(baseFolder) ? relative("/", baseFolder) : baseFolder;
  }

  private mutexKey(basePrefix: string) {
    return [S3Adapter.name, basePrefix];
  }

  private constructClient(connection: Step.S3Connection) {
    if (connection.format === "url") {
      const { accessKey, secretKey, endpoint, bucket, region } = UrlParser.s3(this.resolveString(connection.url));
      return new BrespiS3Client({
        bucket,
        endpoint,
        region,
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      });
    }
    const { properties } = connection;
    return new BrespiS3Client({
      bucket: this.resolveString(properties.bucket),
      endpoint: this.resolveString(properties.endpoint),
      region: properties.region ? this.resolveString(properties.region) : undefined,
      accessKeyId: this.resolveString(properties.accessKey),
      secretAccessKey: this.resolveString(properties.secretKey),
    });
  }

  private createReadWriteFns(client: S3Client): ManagedStorageCapability.ReadWriteFns {
    return {
      writeFn: async (item: { path: string; content: string }) => {
        await client.write(item.path, item.content);
      },
      readFn: async (path: string) => {
        try {
          this.log.debug("A");
          const file = client.file(path);
          this.log.debug("B");
          const exists = await file.exists();
          this.log.debug("C");
          return exists ? await file.text() : undefined;
        } catch (e) {
          this.log.debug("E", e);
          throw e;
        }
      },
    };
  }
}
