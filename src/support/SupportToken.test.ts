import { TestEnvironment } from "@/testing/TestEnvironment.test";
import { Temporal } from "@js-temporal/polyfill";
import { beforeAll, describe, expect, it } from "bun:test";
import crypto from "crypto";
import { SupportToken } from "./SupportToken";

describe("SupportToken", async () => {
  const keys = {
    // Private key was converted once from the OpenSSH format to PKCS8 PEM
    private: "-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIF6JdTbY1BmzmSd/dPmWBc64lAzRPJq5s3bltwrnC/G5\n-----END PRIVATE KEY-----",
    public: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILU3AARwGfPLsWOI08fK+ZC6cilnqr05Y/7M5mzqwx8K",
  };

  beforeAll(async () => {
    await TestEnvironment.initialize();
  });

  it("successfully validates a correct token", () => {
    // given
    const token = sign("v=1;t=1773490583;app=brespi;amt=1000;cur=usd");
    // when
    const loveToken = SupportToken.validate(encode(token), keys.public);
    // then
    expect(loveToken).toBeDefined();
    expect(loveToken).toEqual({
      app: "brespi",
      amount: 1000,
      currency: "usd",
      timestamp: Temporal.Instant.fromEpochMilliseconds(1773490583 * 1000),
    });
  });

  it("returns undefined for an invalid signature", () => {
    const token = "v=1;t=1773490583;app=brespi;amt=1000;cur=usd;s=aW52YWxpZA==";
    expect(SupportToken.validate(encode(token), keys.public)).toBeUndefined();
  });

  it("returns undefined for a tampered payload", () => {
    const token = sign("v=1;t=1773490583;app=brespi;amt=1000;cur=usd");
    const tampered = token.replace("amt=1000", "amt=9999");
    expect(SupportToken.validate(encode(tampered), keys.public)).toBeUndefined();
  });

  it("returns undefined for a malformed token", () => {
    expect(SupportToken.validate(encode("garbage"), keys.public)).toBeUndefined();
  });

  function sign(payload: string): string {
    const key = crypto.createPrivateKey({ key: keys.private, format: "pem" });
    const signature = crypto.sign(null, Buffer.from(payload), key);
    return `${payload};s=${signature.toString("base64")}`;
  }

  function encode(token: string): string {
    return Buffer.from(token, "utf-8").toString("hex");
  }
});
