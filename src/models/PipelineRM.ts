import { ZodParser } from "@/helpers/ZodParser";
import { Execution } from "@/models/Execution";
import { Pipeline } from "@/models/Pipeline";
import z from "zod/v4";

// read model
export type PipelineRM = Pipeline & {
  lastExecution?: Execution;
};

export namespace PipelineRM {
  export const parse = ZodParser.forType<PipelineRM>()
    .ensureSchemaMatchesType(() =>
      Pipeline.parse.SCHEMA.and(
        z.object({
          lastExecution: Execution.parse.SCHEMA.optional(),
        }),
      ),
    )
    .ensureTypeMatchesSchema();
}
