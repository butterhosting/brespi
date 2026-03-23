import { Step } from "@/models/Step";
import { AdapterService } from "./AdapterService";
import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { TestFixture } from "@/testing/TestFixture.test";
import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { CompressionAdapter } from "./compression/CompressionAdapter";
import { EncryptionAdapter } from "./encyption/EncryptionAdapter";
import { FilesystemAdapter } from "./filesystem/FilesystemAdapter";
import { FilterAdapter } from "./filter/FilterAdapter";
import { MariadbAdapter } from "./mariadb/MariadbAdapter";
import { PostgresqlAdapter } from "./postgresql/PostgresqlAdapter";
import { S3Adapter } from "./s3/S3Adapter";
import { ScriptAdapter } from "./scripting/ScriptAdapter";

describe(AdapterService.name, () => {
  let service: AdapterService;

  beforeEach(async () => {
    await TestEnvironment.initialize();
    service = new AdapterService(
      {} as FilesystemAdapter,
      {} as CompressionAdapter,
      {} as EncryptionAdapter,
      {} as FilterAdapter,
      {} as ScriptAdapter,
      {} as S3Adapter,
      {} as PostgresqlAdapter,
      {} as MariadbAdapter,
    );
  });

  it("logs an error when a sensitive field contains a plaintext value", async () => {
    // given
    const step = TestFixture.createStep(Step.Type.encryption, { key: "my-plaintext-key" });
    // when
    const errorSpy = spyOn(console, "error");
    await service.submit([], step, []).catch(() => {});
    // then
    expect(errorSpy).toHaveBeenCalledWith(
      expect.anything(), //
      expect.stringContaining('plaintext value for sensitive field "key"'),
    );
  });

  it("does not log when a sensitive field uses ${VARIABLE} syntax", async () => {
    // given
    const step = TestFixture.createStep(Step.Type.encryption, { key: "${MY_ENCRYPTION_KEY}" });
    // when
    const errorSpy = spyOn(console, "error");
    await service.submit([], step, []).catch(() => {});
    // then
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logs an error for nested sensitive fields", async () => {
    // given
    const step = TestFixture.createStep(Step.Type.s3_upload, {
      connection: {
        format: "properties",
        properties: {
          bucket: "bucko",
          endpoint: "http://s3:9090",
          accessKey: "${MY_S3_ACCESS_KEY}",
          secretKey: "my-plaintext-secret",
        },
      },
    });
    // when
    const errorSpy = spyOn(console, "error");
    await service.submit([], step, []).catch(() => {});
    // then
    expect(errorSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('plaintext value for sensitive field "connection.properties.secretKey"'),
    );
  });

  it("does not log for step types with no sensitive fields", async () => {
    // given
    const step = TestFixture.createStep(Step.Type.compression);
    // when
    const errorSpy = spyOn(console, "error");
    await service.submit([], step, []).catch(() => {});
    // then
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
