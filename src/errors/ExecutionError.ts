import { Yexception } from "yexception";

export class ExecutionError {
  public static readonly NAME = "ExecutionError";
  // general
  public static readonly not_found = Yexception.field();
  public static readonly already_exists = Yexception.field();
  public static readonly already_executing = Yexception.field<{ id: string }>();
  // adapters
  public static readonly unknown = Yexception.field();
  public static readonly algorithm_unsupported = Yexception.field<{ algorithm: string }>();
  // artifacts, files & folder
  public static readonly artifact_type_invalid = Yexception.field<{ name: string; type: string; requiredType: string }>();
  public static readonly artifact_count_invalid = Yexception.field<{ count: number; min?: number; max?: number }>();
  public static readonly fspath_does_not_exist = Yexception.field<{ path: string }>();
  public static readonly fspath_type_invalid = Yexception.field<{ path: string; type: string; requiredType: string }>();
  public static readonly fsdir_children_count_invalid = Yexception.field<{ path: string; count: number; min?: number; max?: number }>();
  // scripts
  public static readonly nonzero_script_exit = Yexception.field<{ cause: string }>();
  // managed storage
  public static readonly managed_storage_corrupted = Yexception.field<{ descriptor: "manifest" | "listing" }>();
  public static readonly managed_storage_manifest_empty = Yexception.field();
  public static readonly managed_storage_version_not_found = Yexception.field<{ version: string }>();
  public static readonly managed_storage_version_not_uniquely_identified = Yexception.field<{ version: string }>();
  // compression/decompression
  public static readonly compression_failed = Yexception.field<{ cause: string }>();
  public static readonly decompression_failed = Yexception.field<{ cause: string }>();
  // encryption/decryption
  public static readonly encryption_failed = Yexception.field<{ cause: string }>();
  public static readonly decryption_failed = Yexception.field<{ cause: string }>();
  // postgresql
  public static readonly postgresql_backup_failed = Yexception.field<{ cause: string }>();
  public static readonly postgresql_restore_failed = Yexception.field<{ cause: string }>();
  // mariadb
  public static readonly mariadb_backup_failed = Yexception.field<{ cause: string }>();
  public static readonly mariadb_restore_failed = Yexception.field<{ cause: string }>();

  static {
    Yexception.initialize(this);
  }
}
