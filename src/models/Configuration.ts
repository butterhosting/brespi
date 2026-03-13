import { ZodParser } from "@/helpers/ZodParser";
import { Json } from "@/types/Json";
import z from "zod/v4";
import { NotificationPolicy } from "./NotificationPolicy";
import { Pipeline } from "./Pipeline";
import { Schedule } from "./Schedule";

export type Configuration = Configuration.Core & {
  synchronized: boolean;
};

export namespace Configuration {
  export type Core = {
    schema: 1;
    pipelines: Pipeline[];
    schedules: Schedule.Core[];
    notificationPolicies: NotificationPolicy.Core[];
  };
  export namespace Core {
    export function empty(): Core {
      return {
        schema: 1,
        pipelines: [],
        schedules: [],
        notificationPolicies: [],
      };
    }
    export function isEmpty(subject: Json): boolean {
      if (!subject || typeof subject !== "object" || Array.isArray(subject)) {
        return false;
      }
      const s = subject as Record<keyof Core, unknown>;
      if (Object.keys(s).length !== Object.keys(Core.empty()).length) {
        return false;
      }
      const isEmptyArray = (v: unknown) => Array.isArray(v) && v.length === 0;
      // Record<keyof Core, ...> ensures every Core key is covered.
      // Adding a property to Core without updating this will cause a type error.
      const checks: Record<keyof Core, boolean> = {
        schema: true,
        pipelines: isEmptyArray(s.pipelines),
        schedules: isEmptyArray(s.schedules),
        notificationPolicies: isEmptyArray(s.notificationPolicies),
      };
      return Object.values(checks).every(Boolean);
    }

    export const parse = ZodParser.forType<Core>()
      .ensureSchemaMatchesType(() =>
        z.object({
          schema: z.literal(1),
          pipelines: z.array(Pipeline.parse.SCHEMA),
          schedules: z.array(Schedule.Core.parse.SCHEMA),
          notificationPolicies: z.array(NotificationPolicy.Core.parse.SCHEMA),
        }),
      )
      .ensureTypeMatchesSchema();
  }

  export const parse = ZodParser.forType<Configuration>()
    .ensureSchemaMatchesType(() => {
      return Core.parse.SCHEMA.and(
        z.object({
          synchronized: z.boolean(),
        }),
      );
    })
    .ensureTypeMatchesSchema();
}
