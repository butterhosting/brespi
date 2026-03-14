import { Temporal } from "@js-temporal/polyfill";
import { isAbsolute, join } from "path";
import { z } from "zod/v4";
import packageJson from "../package.json";
import { TimeZone } from "./helpers/TimeZone";
import { LogLevel } from "./models/LogLevel";
import { SupportToken } from "./support/SupportToken";

export namespace Env {
  const baseEnv = z.object({
    O_BRESPI_STAGE: z.enum(["development", "e2etest", "production"]),
    O_BRESPI_TIMEZONE: z.string().refine((tz) => TimeZone.check(tz), {
      error: "invalid_timezone",
    }),
    X_BRESPI_ROOT: z.string(),
    X_BRESPI_LOGGING: z.enum(LogLevel),
    X_BRESPI_SUPPORT_TOKEN: z.string().optional(),
    X_BRESPI_ENABLE_RESTRICTED_ENTPOINTS: z.enum(["true", "false"]),
  });
  export function initialize(timezone = Temporal.Now.timeZoneId() as "UTC", environment = Bun.env as z.output<typeof baseEnv>) {
    if (timezone !== "UTC") {
      throw new Error(`Invalid timezone: ${timezone}`);
    }
    return baseEnv
      .transform(({ X_BRESPI_ROOT, X_BRESPI_SUPPORT_TOKEN, ...env }) => ({
        ...env,
        X_BRESPI_ROOT: isAbsolute(X_BRESPI_ROOT) ? X_BRESPI_ROOT : join(process.cwd(), X_BRESPI_ROOT),
        O_BRESPI_SUPPORTER: Boolean(X_BRESPI_SUPPORT_TOKEN && SupportToken.validate(X_BRESPI_SUPPORT_TOKEN)),
      }))
      .transform((env) => {
        const data = "data";
        return {
          ...env,
          O_BRESPI_COMMIT: packageJson.commit.slice(0, 7),
          O_BRESPI_VERSION: packageJson.version,
          O_BRESPI_CONFIGURATION: join(env.X_BRESPI_ROOT, "config.json"),
          X_BRESPI_HTPASSWD: join(env.X_BRESPI_ROOT, ".htpasswd"),
          X_BRESPI_TMP_ROOT: join(env.X_BRESPI_ROOT, "tmp"),
          X_BRESPI_DATA_ROOT: join(env.X_BRESPI_ROOT, data),
          X_BRESPI_DATABASE: join(env.X_BRESPI_ROOT, data, "db.sqlite"),
          X_BRESPI_ARTIFICIAL_STEP_EXECUTION_DELAY: Temporal.Duration.from(
            env.O_BRESPI_STAGE === "development" ? { seconds: 0 } : { seconds: 0 }, //
          ),
          X_BRESPI_TMP_ITEMS_RETENTION_PERIOD: Temporal.Duration.from(
            env.O_BRESPI_STAGE === "development" ? { minutes: 5 } : { days: 3 }, //
          ),
          X_BRESPI_ENABLE_RESTRICTED_ENTPOINTS: env.X_BRESPI_ENABLE_RESTRICTED_ENTPOINTS === "true",
        };
      })
      .parse(environment);
  }

  export type Private = ReturnType<typeof initialize>;

  export type Public = Readonly<{
    [K in keyof Private as K extends `${PublicPrefix}${string}` ? K : never]: Private[K] extends z.ZodTypeAny
      ? z.output<Private[K]>
      : Private[K];
  }>;
  export type PublicPrefix = "O_BRESPI_";
}
