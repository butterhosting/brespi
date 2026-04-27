import { $execution } from "@/drizzle/schema";
import { Sqlite } from "@/drizzle/sqlite";
import { Env } from "@/Env";
import { Temporal } from "@js-temporal/polyfill";
import { isNull } from "drizzle-orm";
import { readdir, rm } from "fs/promises";
import { join } from "path";

export class CleanupService {
  public constructor(
    private readonly env: Env.Private,
    private readonly sqlite: Sqlite,
  ) {}

  public async initializeCleanup() {
    await this.cleanPendingExecutions(); // only do this once during startup (cannot have pending executions)
    await this.cleanTmpFolder();
    setInterval(() => this.cleanTmpFolder(), 60_000);
  }

  private async cleanTmpFolder() {
    const tmpRoot = this.env.X_BRESPI_TMP_ROOT;
    const entries = await readdir(tmpRoot);

    const pattern = /^(\d+)-(.+)$/;
    for (const entry of entries) {
      // Step 1: if the entry inside this folder does not match the pattern `{number}-{string}`, remove it
      const match = entry.match(pattern);
      if (!match) {
        await rm(join(tmpRoot, entry), { recursive: true, force: true });
        continue;
      }

      // Step 2: parse the numeric element (the part before the hyphen) as a unix timestamp, and see how much time has elapsed
      const createdAt = Temporal.Instant.fromEpochMilliseconds(Number(match[1]));
      const elapsed = Temporal.Now.instant().since(createdAt);

      // Step 3: compare it to the current retention period, and if it's too old, remove it
      const retentionPeriod = this.env.X_BRESPI_TMP_ITEMS_RETENTION_PERIOD;
      if (Temporal.Duration.compare(elapsed, retentionPeriod) > 0) {
        await rm(join(tmpRoot, entry), { recursive: true, force: true });
      }
    }
  }

  private async cleanPendingExecutions() {
    await this.sqlite.delete($execution).where(isNull($execution.resultCompletedAt));
  }
}
