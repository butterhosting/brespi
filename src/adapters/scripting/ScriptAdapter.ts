import { PropertyResolver } from "@/capabilities/propertyresolution/PropertyResolver";
import { Env } from "@/Env";
import { ExecutionError } from "@/errors/ExecutionError";
import { Artifact } from "@/models/Artifact";
import { Step } from "@/models/Step";
import { readdir, rename, rm } from "fs/promises";
import { basename, dirname, join } from "path";
import { AbstractAdapter } from "../AbstractAdapter";
import { AdapterResult } from "../AdapterResult";
import { Logger } from "@/Logger";

export class ScriptAdapter extends AbstractAdapter {
  private readonly log = new Logger(__filename);
  public constructor(
    protected readonly env: Env.Private,
    protected readonly propertyResolver: PropertyResolver,
  ) {
    super(env, propertyResolver);
  }

  public async execute(artifacts: Artifact[], step: Step.CustomScript): Promise<AdapterResult> {
    const scriptPath = this.resolveString(step.path);
    if (step.passthrough) {
      this.log.debug(`Executing script in passthrough mode; scriptPath=${scriptPath}`);
      await this.executeScript(scriptPath);

      this.log.info(`Successfully executed script in passthrough mode; scriptPath=${scriptPath}`);
      return AdapterResult.create(artifacts);
    }
    this.log.debug(`Preparing to execute script; scriptPath=${scriptPath}, artifacts.length=${artifacts.length}`);
    const [artifactsIn, artifactsOut] = await Promise.all([
      this.createTmpDestination(), //
      this.createTmpDestination(),
    ]);
    try {
      this.log.debug(`Moving artifacts to input directory; artifacts.length=${artifacts.length}`);
      await this.moveArtifacts(artifacts, artifactsIn);
      this.log.debug(`Executing script; scriptPath=${scriptPath}`);
      await this.executeScript(scriptPath, {
        BRESPI_ARTIFACTS_IN: artifactsIn,
        BRESPI_ARTIFACTS_OUT: artifactsOut,
      });
      const outputArtifacts = await this.readArtifactsFromDirectory(artifactsOut);

      this.log.info(`Successfully executed script; scriptPath=${scriptPath}, input.length=${artifacts.length}, output.length=${outputArtifacts.length}`);
      return AdapterResult.create(outputArtifacts);
    } finally {
      await Promise.all([
        rm(artifactsIn, { recursive: true, force: true }), //
        rm(artifactsOut, { recursive: true, force: true }),
      ]);
    }
  }

  private async executeScript(scriptPath: string, executionEnv: Record<string, string> = {}): Promise<void> {
    try {
      await this.runCommand({
        cmd: ["bash", "-c", `./${basename(scriptPath)}`],
        cwd: dirname(scriptPath),
        env: {
          ...Bun.env,
          ...executionEnv,
        },
      });
    } catch (e) {
      throw this.mapError(e, ExecutionError.nonzero_script_exit);
    }
  }

  private async moveArtifacts(artifacts: Artifact[], targetDir: string): Promise<void> {
    for (const artifact of artifacts) {
      const targetPath = join(targetDir, artifact.name);
      await rename(artifact.path, targetPath);
    }
  }

  private async readArtifactsFromDirectory(dirPath: string): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const inputPath = join(dirPath, entry.name);
      const { outputId, outputPath } = this.generateArtifactDestination();
      await rename(inputPath, outputPath);
      artifacts.push({
        id: outputId,
        type: entry.isFile() ? "file" : "directory",
        path: outputPath,
        name: entry.name,
      });
    }
    return artifacts;
  }
}
