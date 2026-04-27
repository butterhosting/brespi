import { Migration } from "./Migration";

export class MigrationV002 implements Migration {
  file(): string {
    return __filename;
  }

  /**
   * Sets a `level` default for this new mandatory property in the `folder_flatten` step
   */
  async apply(configuration: any): Promise<any> {
    return {
      ...configuration,
      pipelines: configuration.pipelines.map((pipeline: any) => ({
        ...pipeline,
        steps: pipeline.steps.map((step: any) => {
          if (step.type === "folder_flatten") {
            return {
              ...step,
              level: -1, // New required property
            };
          }
          return step;
        }),
      })),
    };
  }
}
