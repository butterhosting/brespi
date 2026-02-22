import { DotPath } from "@/types/DotPath";
import { Step } from "./Step";

export type StepWarning = {
  fields: string[];
};

export namespace StepWarning {
  type SensitiveFieldsMap = {
    [T in Step.Type]?: Array<DotPath<Extract<Step, { type: T }>>>;
  };

  export function sensitiveFields(): SensitiveFieldsMap;
  export function sensitiveFields(type: Step.Type): string[];
  export function sensitiveFields(type?: Step.Type): SensitiveFieldsMap | string[] {
    const result: SensitiveFieldsMap = {
      [Step.Type.encryption]: ["key"],
      [Step.Type.decryption]: ["key"],
      [Step.Type.s3_upload]: ["connection.url", "connection.properties.secretKey"],
      [Step.Type.s3_download]: ["connection.url", "connection.properties.secretKey"],
      [Step.Type.postgresql_backup]: ["connection.url", "connection.properties.password"],
      [Step.Type.postgresql_restore]: ["connection.url", "connection.properties.password"],
      [Step.Type.mariadb_backup]: ["connection.url", "connection.properties.password"],
      [Step.Type.mariadb_restore]: ["connection.url", "connection.properties.password"],
    };
    return type ? result[type] || [] : result;
  }
}
