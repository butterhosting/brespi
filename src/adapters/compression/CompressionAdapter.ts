import { PropertyResolver } from "@/capabilities/propertyresolution/PropertyResolver";
import { Env } from "@/Env";
import { ExecutionError } from "@/errors/ExecutionError";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { readdir, rename, rm } from "fs/promises";
import { basename, dirname, join } from "path";
import { AbstractAdapter } from "../AbstractAdapter";
import { Logger } from "@/Logger";
import { AdapterResult } from "../AdapterResult";

export class CompressionAdapter extends AbstractAdapter {
  private readonly log = new Logger(__filename);
  private readonly EXTENSION_TAR = ".tar";
  private readonly EXTENSION_TAR_GZIP = ".tar.gz";

  public constructor(
    protected readonly env: Env.Private,
    protected readonly propertyResolver: PropertyResolver,
  ) {
    super(env, propertyResolver);
  }

  public async compressAll(artifacts: Artifact[], step: Step.Compression): Promise<AdapterResult> {
    return AdapterResult.create(await this.spreadAndCollect(artifacts, (a) => this.compress(a, step)));
  }

  public async decompressAll(artifacts: Artifact[], step: Step.Decompression): Promise<AdapterResult> {
    return AdapterResult.create(await this.spreadAndCollect(artifacts, (a) => this.decompress(a, step)));
  }

  /**
   * Compresses a file or directory into an archive with configurable compression level.
   * Level 0 produces a plain .tar (no gzip pass); levels 1-9 produce a .tar.gz.
   *
   * Commands to reproduce:
   *   # Level 0: plain tar, no gzip
   *   COPYFILE_DISABLE=1 tar -cf archive.tar -C /path/to/parent (filename|dirname)
   *
   *   # Levels 1-9: tar then gzip at the chosen level
   *   COPYFILE_DISABLE=1 tar -cf archive.tar -C /path/to/parent (filename|dirname)
   *   gzip -9 -c archive.tar > archive.tar.gz
   *   rm archive.tar
   */
  public async compress(artifact: Artifact, step: Step.Compression): Promise<Artifact> {
    const { level } = step.algorithm;
    this.log.debug(`Preparing to compress; artifact=${artifact.name}, level=${level}`);
    const inputPath = artifact.path;
    const { outputId, outputPath } = this.generateArtifactDestination();
    const outputUncompressedTarPath = `${outputPath}.tar`;
    try {
      const env = {
        ...Bun.env,
        COPYFILE_DISABLE: "1", // Prevents macOS tar from creating ._* AppleDouble files
      };

      this.log.debug(`Creating uncompressed tar; artifact=${artifact.name}`);
      await this.runCommand({
        cmd: ["tar", "-cf", outputUncompressedTarPath, "-C", dirname(inputPath), basename(inputPath)],
        env,
      });

      let extension: string;
      if (level === 0) {
        extension = this.EXTENSION_TAR;
        await rename(outputUncompressedTarPath, outputPath);
      } else {
        // Compress with explicit level (output to stdout, redirect to file via shell)
        extension = this.EXTENSION_TAR_GZIP;
        this.log.debug(`Compressing with gzip; artifact=${artifact.name}, level=${level}`);
        await this.runCommand({
          cmd: ["sh", "-c", `gzip -${level} -c "${outputUncompressedTarPath}" > "${outputPath}"`],
          env,
        });
      }

      this.log.info(`Successfully compressed; artifact=${artifact.name}, level=${level}`);
      return {
        id: outputId,
        type: "file",
        path: outputPath,
        name: this.addExtension(artifact.name, extension),
      };
    } catch (e) {
      throw this.mapError(e, ExecutionError.compression_failed);
    } finally {
      if (level > 0) {
        await rm(outputUncompressedTarPath, { recursive: true, force: true });
      }
    }
  }

  /**
   * Decompresses a .tar or .tar.gz archive back to its original file or directory.
   * The archive must contain exactly one top-level item (otherwise, we didn't create it).
   * `tar -xf` auto-detects the format from magic bytes, so both extensions work.
   *
   * Commands to reproduce:
   *   # Extract to temp directory (auto-detects tar vs tar.gz)
   *   tar -xf archive.(tar|tar.gz) -C /temp/dir
   *
   *   # Move the single extracted item to final destination
   *   mv /temp/dir/extracted-item /final/destination
   */
  public async decompress(artifact: Artifact, _step: Step.Decompression): Promise<Artifact> {
    this.requireArtifactType("file", artifact);
    this.log.debug(`Preparing to decompress; artifact=${artifact.name}`);
    const inputPath = artifact.path;
    const tempPath = await this.createTmpDestination();
    try {
      this.log.debug(`Extracting archive; artifact=${artifact.name}`);
      await this.runCommand({
        cmd: ["tar", "-xf", inputPath, "-C", tempPath],
      });

      const singleChildPath = await this.findSingleChildPathWithinDirectory(tempPath);
      const { outputId, outputPath } = this.generateArtifactDestination();
      await rename(singleChildPath, outputPath);

      const stats = await this.requireFilesystemExistence(outputPath);
      const name = this.stripExtension(this.stripExtension(artifact.name, this.EXTENSION_TAR_GZIP), this.EXTENSION_TAR);

      this.log.info(`Successfully decompressed; artifact=${artifact.name}, outputType=${stats.type}`);
      return {
        id: outputId,
        type: stats.type,
        path: outputPath,
        name,
      };
    } catch (e) {
      throw this.mapError(e, ExecutionError.decompression_failed);
    } finally {
      await rm(tempPath, { recursive: true, force: true });
    }
  }

  private async findSingleChildPathWithinDirectory(path: string): Promise<string> {
    const children = await readdir(path);
    const min = 1;
    const max = 1;
    const count = children.length;
    if (count < min || count > max) {
      throw ExecutionError.fsdir_children_count_invalid({ path, count, min, max });
    }
    return join(path, children[0]);
  }
}
