import { FilterCapability } from "@/capabilities/filter/FilterCapability";
import { ManagedStorageCapability } from "@/capabilities/managedstorage/ManagedStorageCapability";
import { Env } from "@/Env";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { StepWithRuntime } from "@/models/StepWithRuntime";
import { copyFile, cp, mkdir, readdir, rename, rm } from "fs/promises";
import { basename, join } from "path";
import { AbstractAdapter } from "../AbstractAdapter";
import { AdapterResult } from "../AdapterResult";
import { PropertyResolver } from "@/capabilities/propertyresolution/PropertyResolver";
import { Logger } from "@/Logger";

export class FilesystemAdapter extends AbstractAdapter {
  private readonly log = new Logger(__filename);
  public constructor(
    protected readonly env: Env.Private,
    protected readonly propertyResolver: PropertyResolver,
    private readonly managedStorageCapability: ManagedStorageCapability,
    private readonly filterCapability: FilterCapability,
  ) {
    super(env, propertyResolver);
  }

  public async write(
    artifacts: Array<Pick<Artifact, "type" | "name" | "path">>,
    step: Step.FilesystemWrite,
    trail: StepWithRuntime[],
  ): Promise<AdapterResult> {
    const folderPath = this.resolveString(step.folderPath);
    await mkdir(folderPath, { recursive: true });
    if (step.managedStorage) {
      this.requireArtifactType("file", ...artifacts);
      const base = folderPath;
      const mutexKey = this.mutexKey(base);
      const readWriteFns = this.createReadWriteFns();

      this.log.debug(`Preparing to update the storage manifest; folderPath=${folderPath}`);
      const { insertableArtifacts } = await this.managedStorageCapability.insert({
        mutexKey,
        artifacts,
        trail,
        base,
        ...readWriteFns,
      });

      this.log.debug(`Preparing to write artifacts; folderPath=${folderPath}, insertableArtifacts.length=${insertableArtifacts.length}`);
      for (const { path, destinationPath } of insertableArtifacts) {
        await Bun.write(destinationPath, Bun.file(path));
      }

      if (step.retention) {
        this.log.debug(`Preparing to update the storage manifest again for removal operations; folderPath=${folderPath}`);
        const { removableItems } = await this.managedStorageCapability.clean({
          mutexKey,
          base,
          configuration: step.retention,
          ...readWriteFns,
        });

        this.log.debug(`Preparing to remove artifacts; folderPath=${folderPath}, removableItems.length=${removableItems.length}`);
        for (const { version } of removableItems) {
          await rm(join(base, version), { recursive: true, force: true });
        }
      }
    } else {
      this.log.debug(`Preparing to write artifacts; folderPath=${folderPath}, artifacts.length=${artifacts.length}`);
      for (const artifact of artifacts) {
        const destinationPath = join(folderPath, artifact.name);
        if (artifact.type === "file") {
          await copyFile(artifact.path, destinationPath);
        } else if (artifact.type === "directory") {
          await cp(artifact.path, destinationPath, { recursive: true });
        }
      }
    }

    this.log.info(`Successfully wrote artifacts; folderPath=${folderPath}, artifacts.length=${artifacts.length}`);
    return AdapterResult.create();
  }

  public async read(step: Step.FilesystemRead): Promise<AdapterResult> {
    const path = this.resolveString(step.path);
    if (step.managedStorage) {
      this.log.debug(`Selecting version from managed storage; path=${path}`);
      // Find artifacts
      let { resolvedVersion, selectableArtifacts } = await this.managedStorageCapability.select({
        mutexKey: this.mutexKey(path),
        base: path,
        configuration: step.managedStorage,
        ...this.createReadWriteFns(),
      });
      // Optional: filter
      if (step.filterCriteria) {
        this.log.debug(`Applying filter criteria; method=${step.filterCriteria.method}`);
        const { predicate } = this.filterCapability.createPredicate(step.filterCriteria);
        selectableArtifacts = selectableArtifacts.filter(predicate);
      }
      // Retrieve artifacts
      this.log.debug(`Preparing to read artifacts; path=${path}, selectableArtifacts.length=${selectableArtifacts.length}`);
      const artifacts: Artifact[] = [];
      for (const { name, path } of selectableArtifacts) {
        const { outputId, outputPath } = this.generateArtifactDestination();
        await Bun.write(outputPath, Bun.file(path));
        artifacts.push({
          id: outputId,
          type: "file",
          path: outputPath,
          name,
        });
      }

      this.log.info(`Successfully read artifacts; path=${path}, version=${resolvedVersion}, artifacts.length=${artifacts.length}`);
      return AdapterResult.create(artifacts, { version: resolvedVersion });
    } else {
      this.log.debug(`Preparing to read from path; path=${path}`);
      const { outputId, outputPath } = this.generateArtifactDestination();
      const stats = await this.requireFilesystemExistence(path);
      await cp(path, outputPath, { recursive: true });

      this.log.info(`Successfully read artifact; path=${path}, type=${stats.type}`);
      return AdapterResult.create({
        id: outputId,
        type: stats.type,
        path: outputPath,
        name: basename(path),
      });
    }
  }

  public async folderFlatten(artifacts: Artifact[], _step: Step.FolderFlatten): Promise<AdapterResult> {
    this.log.debug(`Preparing to flatten artifacts; artifacts.length=${artifacts.length}`);
    const result: Artifact[] = [];
    for (const artifact of artifacts) {
      if (artifact.type === "file") {
        result.push(artifact); // Re-use is okay; cleanup won't clean output artifacts
      } else {
        result.push(...(await this.readDirectoryRecursively(artifact.path)));
      }
    }

    this.log.info(`Successfully flattened artifacts; input.length=${artifacts.length}, output.length=${result.length}`);
    return AdapterResult.create(result);
  }

  public async folderGroup(artifacts: Artifact[], _step: Step.FolderGroup): Promise<AdapterResult> {
    this.log.debug(`Preparing to group artifacts; artifacts.length=${artifacts.length}`);
    const { outputId, outputPath } = this.generateArtifactDestination();
    await mkdir(outputPath);
    for (const artifact of artifacts) {
      await rename(artifact.path, join(outputPath, artifact.name));
    }

    this.log.info(`Successfully grouped artifacts; artifacts.length=${artifacts.length}`);
    return AdapterResult.create({
      id: outputId,
      type: "directory",
      name: `group(${artifacts.length})`,
      path: outputPath,
    });
  }

  private mutexKey(baseFolder: string) {
    return [FilesystemAdapter.name, baseFolder];
  }

  private createReadWriteFns(): ManagedStorageCapability.ReadWriteFns {
    return {
      async writeFn(item: { path: string; content: string }) {
        await Bun.write(item.path, item.content);
      },
      async readFn(path: string) {
        const file = Bun.file(path);
        const exists = await file.exists();
        return exists ? await file.text() : undefined;
      },
    };
  }

  private async readDirectoryRecursively(dirPath: string): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isFile()) {
        const { outputId, outputPath } = this.generateArtifactDestination();
        await rename(fullPath, outputPath);
        artifacts.push({
          id: outputId,
          type: "file",
          path: outputPath,
          name: entry.name,
        });
      } else if (entry.isDirectory()) {
        const subArtifacts = await this.readDirectoryRecursively(fullPath);
        artifacts.push(...subArtifacts);
      }
    }
    return artifacts;
  }
}
