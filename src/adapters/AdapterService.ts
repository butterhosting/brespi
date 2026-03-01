import { PropertyExtractor } from "@/capabilities/propertyresolution/PropertyExtractor";
import { Logger } from "@/Logger";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { StepWarning } from "@/models/StepWarning";
import { StepWithRuntime } from "@/models/StepWithRuntime";
import { AdapterResult } from "./AdapterResult";
import { CompressionAdapter } from "./compression/CompressionAdapter";
import { EncryptionAdapter } from "./encyption/EncryptionAdapter";
import { FilesystemAdapter } from "./filesystem/FilesystemAdapter";
import { FilterAdapter } from "./filter/FilterAdapter";
import { MariadbAdapter } from "./mariadb/MariadbAdapter";
import { PostgresqlAdapter } from "./postgresql/PostgresqlAdapter";
import { S3Adapter } from "./s3/S3Adapter";
import { ScriptAdapter } from "./scripting/ScriptAdapter";

type Handler<S extends Step> = (artifacts: Artifact[], step: S, trail: StepWithRuntime[]) => Promise<AdapterResult>;

type InternalRegistry = {
  [T in Step.Type]: Handler<Extract<Step, { type: T }>>;
};

export class AdapterService {
  private readonly log = new Logger(__filename);
  private readonly registry: InternalRegistry;

  public constructor(
    filesystemAdapter: FilesystemAdapter,
    compressionAdapter: CompressionAdapter,
    encryptionAdapter: EncryptionAdapter,
    filterAdapter: FilterAdapter,
    scriptAdapter: ScriptAdapter,
    s3Adapter: S3Adapter,
    postgresqlAdapter: PostgresqlAdapter,
    mariadbAdapter: MariadbAdapter,
  ) {
    this.registry = {
      [Step.Type.filesystem_read]: async (_, options) => {
        return await filesystemAdapter.read(options);
      },
      [Step.Type.filesystem_write]: async (artifacts, options, trail) => {
        return await filesystemAdapter.write(artifacts, options, trail);
      },
      [Step.Type.compression]: async (artifacts, options) => {
        return await compressionAdapter.compressAll(artifacts, options);
      },
      [Step.Type.decompression]: async (artifacts, options) => {
        return await compressionAdapter.decompressAll(artifacts, options);
      },
      [Step.Type.encryption]: async (artifacts, options) => {
        return await encryptionAdapter.encryptAll(artifacts, options);
      },
      [Step.Type.decryption]: async (artifacts, options) => {
        return await encryptionAdapter.decryptAll(artifacts, options);
      },
      [Step.Type.folder_flatten]: async (artifacts, options) => {
        return await filesystemAdapter.folderFlatten(artifacts, options);
      },
      [Step.Type.folder_group]: async (artifacts, options) => {
        return await filesystemAdapter.folderGroup(artifacts, options);
      },
      [Step.Type.filter]: async (artifacts, options) => {
        return await filterAdapter.filter(artifacts, options);
      },
      [Step.Type.custom_script]: async (artifacts, options) => {
        return await scriptAdapter.execute(artifacts, options);
      },
      [Step.Type.s3_upload]: async (artifacts, options, trail) => {
        return await s3Adapter.upload(artifacts, options, trail);
      },
      [Step.Type.s3_download]: async (_, options) => {
        return await s3Adapter.download(options);
      },
      [Step.Type.postgresql_backup]: async (_, options) => {
        return await postgresqlAdapter.backup(options);
      },
      [Step.Type.postgresql_restore]: async (artifacts, options) => {
        return await postgresqlAdapter.restore(artifacts, options);
      },
      [Step.Type.mariadb_backup]: async (_, options) => {
        return await mariadbAdapter.backup(options);
      },
      [Step.Type.mariadb_restore]: async (artifacts, options) => {
        return await mariadbAdapter.restore(artifacts, options);
      },
    };
  }

  public async submit<S extends Step>(artifacts: Artifact[], step: S, trail: StepWithRuntime[]): Promise<AdapterResult> {
    const handler = this.registry[step.type] as Handler<S>;
    if (!handler) {
      throw new Error(`Unknown step type: ${step.type}`);
    }
    this.detectPlaintextSensitiveFields(step);
    return await handler(artifacts, step, trail);
  }

  private detectPlaintextSensitiveFields(step: Step): void {
    for (const dotPath of StepWarning.sensitiveFields(step.type)) {
      const value = dotPath.split(".").reduce<unknown>((obj, key) => (obj as Record<string, unknown>)?.[key], step);
      if (typeof value === "string" && !PropertyExtractor.containsReference(value)) {
        this.log.error(
          `Step "${step.type}" has a plaintext value for sensitive field "${dotPath}"; please use \${VARIABLE} syntax instead`,
        );
      }
    }
  }
}
