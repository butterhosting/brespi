import { Client } from "pg";
import { DatabaseBoundary } from "./interface/DatabaseBoundary";

export class PostgresqlBoundary implements DatabaseBoundary {
  public async database({ operation, database }: DatabaseBoundary.DatabaseOptions): Promise<void> {
    if (operation === "create") {
      await this.execute({ database: "postgresql", sql: `CREATE DATABASE ${database}` });
    } else {
      await this.execute({ database: "postgresql", sql: `DROP DATABASE IF EXISTS ${database}` });
    }
  }

  public async table({ database, table, ...opts }: DatabaseBoundary.TableOptions): Promise<void> {
    if (opts.operation === "create") {
      const columns = Object.entries(opts.tableDefinition)
        .map(([name, type]) => `${name} ${type}`)
        .join(", ");
      await this.execute({ database, sql: `CREATE TABLE ${table} (${columns})` });
    } else {
      await this.execute({ database, sql: `DROP TABLE IF EXISTS ${table}` });
    }
  }

  public async insert({ database, table, rows }: DatabaseBoundary.InsertOptions): Promise<void> {
    if (rows.length === 0) return;
    const columns = Object.keys(rows[0]);
    const values = rows
      .map(
        (row) =>
          `(${columns
            .map((col) => {
              const value = row[col];
              if (value === null) return "NULL";
              if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
              return value;
            })
            .join(", ")})`,
      )
      .join(", ");
    await this.execute({
      database,
      sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${values}`,
    });
  }
  public async setup({ database, tables }: DatabaseBoundary.SetupOptions): Promise<void> {
    await this.database({ operation: "drop", database });
    await this.database({ operation: "create", database });
    for (const { name: table, initialRows: rows } of tables) {
      if (rows.length === 0) {
        throw new Error(`Table ${table} must have at least one row to infer schema`);
      }
      const firstRow = rows[0];
      const tableDefinition: Record<string, string> = {};
      for (const [key, value] of Object.entries(firstRow)) {
        if (value === null) {
          throw new Error(`First row cannot have null values (found null in column ${key})`);
        }
        tableDefinition[key] = this.inferColumnType(key, value);
      }
      await this.table({ operation: "create", database, table, tableDefinition });
      await this.insert({ database, table, rows });
    }
  }

  public async queryAll({ database, table }: DatabaseBoundary.QueryOptions): Promise<DatabaseBoundary.Row[]> {
    return await this.execute({ database, sql: `SELECT * FROM ${table}` });
  }

  public async execute({ database, sql: sqlToExecute }: DatabaseBoundary.ExecuteOptions): Promise<DatabaseBoundary.Row[]> {
    const client = new Client({
      host: "localhost",
      user: "postgresql",
      password: "postgresql",
      database: database,
    });
    try {
      await client.connect();
      const result = await client.query(sqlToExecute);
      return result.rows as DatabaseBoundary.Row[];
    } finally {
      await client.end();
    }
  }

  private inferColumnType(key: string, value: string | number | boolean): string {
    if (key === "id" && typeof value === "number") {
      return "SERIAL PRIMARY KEY";
    }
    if (typeof value === "number") {
      return Number.isInteger(value) ? "INTEGER" : "REAL";
    }
    if (typeof value === "string") {
      return "TEXT";
    }
    if (typeof value === "boolean") {
      return "BOOLEAN";
    }
    throw new Error(`Cannot infer type for column ${key} with value ${value}`);
  }
}
