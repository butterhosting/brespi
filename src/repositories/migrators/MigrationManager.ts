import { basename } from "path";
import { Migration } from "./Migration";
import { MigrationV002 } from "./MigrationV002";
import { Configuration } from "@/models/Configuration";
import { Logger } from "@/Logger";

export class MigrationManager {
  private readonly log = new Logger(__filename);
  private readonly migrators: Migration[];

  public constructor(
    migrators: Migration[] = [
      // New migrators should be added to this list
      new MigrationV002(),
    ],
  ) {
    // sort migrators
    this.migrators = migrators.toSorted((m1, m2) => this.schemaVersion(m1.file()) - this.schemaVersion(m2.file()));
    // check for gaps
    let prevVersion: number | undefined = undefined;
    this.migrators
      .map((migrator) => this.schemaVersion(migrator.file()))
      .forEach((nextVersion) => {
        if (typeof prevVersion === "number") {
          if (prevVersion + 1 !== nextVersion) {
            throw new Error(`Detected invalid migration ordening; previous=${prevVersion}, next=${nextVersion}`);
          }
        }
        prevVersion = nextVersion;
      });
  }

  public async migrate(configuration: any): Promise<any> {
    const schemaProp = "schema" satisfies keyof Configuration.Core;
    const configurationVersion = configuration[schemaProp] as number;
    if (typeof configurationVersion !== "number") {
      throw new Error("Invalid configuration: missing `schema` property");
    }

    const relevantMigrators = this.migrators.filter((m) => this.schemaVersion(m.file()) > configurationVersion);
    if (relevantMigrators.length === 0) {
      this.log.info("No configuration migrations to apply");
    }

    let result = configuration;
    for (const migrator of relevantMigrators) {
      const schemaVersion = this.schemaVersion(migrator.file());
      this.log.info(`Migrating configuration to schema version ${schemaVersion}`);
      result = {
        ...(await migrator.apply(result)),
        [schemaProp]: schemaVersion,
      };
    }
    return result;
  }

  private schemaVersion(file: string): number {
    const filename = basename(file, ".ts");
    const pattern = /^MigrationV(\d{3})$/;
    const match = pattern.exec(filename);
    if (!match) {
      throw new Error(`Invalid migrator; filename=${filename}, pattern=${pattern}`);
    }
    return Number(match[1]);
  }
}
