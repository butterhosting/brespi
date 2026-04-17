export interface DatabaseBoundary {
  database(opts: DatabaseBoundary.DatabaseOptions): Promise<void>;
  setup(opts: DatabaseBoundary.SetupOptions): Promise<void>;
  queryAll(opts: DatabaseBoundary.QueryOptions): Promise<DatabaseBoundary.Row[]>;
  execute(opts: DatabaseBoundary.ExecuteOptions): Promise<DatabaseBoundary.Row[]>;
  insert(opts: DatabaseBoundary.InsertOptions): Promise<void>;
}

export namespace DatabaseBoundary {
  export type Row = Record<string, string | number | boolean | null>;

  export type DatabaseOptions = {
    operation: "create" | "drop";
    database: string;
  };

  export type TableOptions = {
    database: string;
    table: string;
  } & (
    | {
        operation: "create";
        tableDefinition: Record<string, string>;
      }
    | {
        operation: "drop";
      }
  );

  export type InsertOptions = {
    database: string;
    table: string;
    rows: Row[];
  };

  export type SetupOptions = {
    database: string;
    tables: Array<{
      name: string;
      initialRows: Row[];
    }>;
  };

  export type QueryOptions = {
    database: string;
    table: string;
  };

  export type ExecuteOptions = {
    database: string;
    sql: string;
  };
}
