import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { beforeAll, describe, expect, it } from "bun:test";
import { Migration } from "./Migration";
import { MigrationManager } from "./MigrationManager";

describe(MigrationManager.name, () => {
  beforeAll(async () => {
    await TestEnvironment.initialize();
  });

  describe("constructor", () => {
    it("accepts an empty migrator list", () => {
      // when
      const action = () => new MigrationManager([]);
      // then
      expect(action).not.toThrow();
    });

    it("accepts a single migrator", () => {
      // when
      const action = () => new MigrationManager([fakeMigration(2)]);
      // then
      expect(action).not.toThrow();
    });

    it("accepts contiguous migrators starting at any version", () => {
      // when
      const action = () => new MigrationManager([fakeMigration(7), fakeMigration(8), fakeMigration(9)]);
      // then
      expect(action).not.toThrow();
    });

    it("sorts unsorted migrators by version", async () => {
      // given
      const trail: number[] = [];
      const manager = new MigrationManager([
        fakeMigration(4, async (c) => {
          trail.push(4);
          return c;
        }),
        fakeMigration(2, async (c) => {
          trail.push(2);
          return c;
        }),
        fakeMigration(3, async (c) => {
          trail.push(3);
          return c;
        }),
      ]);
      // when
      await manager.migrate({ schema: 1 });
      // then
      expect(trail).toEqual([2, 3, 4]);
    });

    it("throws on a gap in versions", () => {
      // when
      const action = () => new MigrationManager([fakeMigration(1), fakeMigration(3)]);
      // then
      expect(action).toThrow("Detected invalid migration ordening; previous=1, next=3");
    });

    it("throws on duplicate versions", () => {
      // when
      const action = () => new MigrationManager([fakeMigration(2), fakeMigration(2)]);
      // then
      expect(action).toThrow("Detected invalid migration ordening; previous=2, next=2");
    });

    it("throws on a filename that doesn't match the MigrationV### pattern", () => {
      // given
      const bogus: Migration = {
        file: () => "/some/path/NotAMigrator.ts",
        apply: async (c) => c,
      };
      // when
      const action = () => new MigrationManager([bogus]);
      // then
      expect(action).toThrow(/Invalid migrator/);
    });

    it("throws on a filename with the wrong number of digits", () => {
      // given
      const bogus: Migration = {
        file: () => "/some/path/MigrationV12.ts",
        apply: async (c) => c,
      };
      // when
      const action = () => new MigrationManager([bogus]);
      // then
      expect(action).toThrow(/Invalid migrator/);
    });
  });

  describe("migrate()", () => {
    it("throws when the configuration is missing the `schema` property", () => {
      // given
      const manager = new MigrationManager([fakeMigration(2)]);
      // when
      const action = () => manager.migrate({});
      // then
      expect(action()).rejects.toThrow("Invalid configuration: missing `schema` property");
    });

    it("throws when the `schema` property isn't a number", async () => {
      // given
      const manager = new MigrationManager([fakeMigration(2)]);
      // when
      const action = () => manager.migrate({ schema: "1" });
      // then
      expect(action()).rejects.toThrow("Invalid configuration: missing `schema` property");
    });

    it("returns the configuration unchanged when there are no migrators", async () => {
      // given
      const manager = new MigrationManager([]);
      // when
      const originalConfig = { schema: 1, foo: "bar" };
      const migratedConfig = await manager.migrate(originalConfig);
      // then
      expect(migratedConfig).toEqual(originalConfig);
    });

    it("returns the configuration unchanged when it is already at the latest schema version", async () => {
      // given
      const manager = new MigrationManager([
        fakeMigration(2, async () => {
          throw new Error("should not run");
        }),
      ]);
      // when
      const originalConfig = { schema: 2, foo: "bar" };
      const migratedConfig = await manager.migrate(originalConfig);
      // then
      expect(migratedConfig).toEqual(originalConfig);
    });

    it("skips migrators whose version is not greater than the configuration's schema", async () => {
      // given
      const ran: number[] = [];
      const manager = new MigrationManager([
        fakeMigration(2, async (c) => {
          ran.push(2);
          return c;
        }),
        fakeMigration(3, async (c) => {
          ran.push(3);
          return c;
        }),
        fakeMigration(4, async (c) => {
          ran.push(4);
          return c;
        }),
      ]);
      // when
      await manager.migrate({ schema: 3 });
      // then
      expect(ran).toEqual([4]);
    });

    it("applies a single migrator and bumps the schema version", async () => {
      // given
      const manager = new MigrationManager([
        fakeMigration(2, async (c) => ({
          ...c,
          addedByV002: true,
        })),
      ]);
      // when
      const result = await manager.migrate({ schema: 1, original: true });
      // then
      expect(result).toEqual({ schema: 2, original: true, addedByV002: true });
    });

    it("applies multiple migrators in order, feeding output of one into the next", async () => {
      // given
      const manager = new MigrationManager([
        fakeMigration(2, async (c: any) => ({ ...c, value: c.value + 1 })),
        fakeMigration(3, async (c: any) => ({ ...c, value: c.value * 10 })),
        fakeMigration(4, async (c: any) => ({ ...c, value: c.value - 5 })),
      ]);
      // when
      const result = await manager.migrate({ schema: 1, value: 0 });
      // then (0 + 1) * 10 - 5 = 5
      expect(result).toEqual({ schema: 4, value: 5 });
    });

    it("overrides the schema property even if the migrator forgets to set it correctly", async () => {
      // given
      const manager = new MigrationManager([fakeMigration(2, async (c) => ({ ...c, schema: 999 }))]);
      // when
      const result = await manager.migrate({ schema: 1 });
      // then
      expect(result).toEqual({ schema: 2 });
    });

    it("awaits each migrator before invoking the next", async () => {
      // given
      const events: string[] = [];
      const manager = new MigrationManager([
        fakeMigration(2, async (c) => {
          events.push("v2-start");
          await new Promise((r) => setTimeout(r, 10));
          events.push("v2-end");
          return c;
        }),
        fakeMigration(3, async (c) => {
          events.push("v3-start");
          return c;
        }),
      ]);
      // when
      await manager.migrate({ schema: 1 });
      // then
      expect(events).toEqual(["v2-start", "v2-end", "v3-start"]);
    });
  });

  function fakeMigration(version: number, apply: Migration["apply"] = async (c) => c): Migration {
    const padded = String(version).padStart(3, "0");
    return {
      file: () => `/some/path/MigrationV${padded}.ts`,
      apply,
    };
  }
});
