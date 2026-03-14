import { Logger } from "@/Logger";
import { Temporal } from "@js-temporal/polyfill";
import crypto from "crypto";

export type SupportToken = {
  app: string;
  amount: number;
  currency: string;
  timestamp: Temporal.Instant;
};

export namespace SupportToken {
  const log = new Logger(__filename, "lazy");

  export function validate(
    hexToken: string,
    verificationKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILU3AARwGfPLsWOI08fK+ZC6cilnqr05Y/7M5mzqwx8K",
  ): SupportToken | undefined {
    try {
      const token = Buffer.from(hexToken, "hex").toString("utf-8");
      const signatureMarker = ";s=";
      const signatureMarkerIndex = token.lastIndexOf(signatureMarker);
      if (signatureMarkerIndex === -1) {
        log.warn("Token malformed");
        return undefined;
      }

      const payload = token.substring(0, signatureMarkerIndex);
      const signature = Buffer.from(token.substring(signatureMarkerIndex + signatureMarker.length), "base64");
      const publicKey = sshPublicKeyToKeyObject(verificationKey);
      if (!crypto.verify(null, Buffer.from(payload), publicKey, signature)) {
        log.warn("Token invalid");
        return undefined;
      }
      const fields = new Map(
        payload.split(";").map((part) => {
          const eq = part.indexOf("=");
          return [part.substring(0, eq), part.substring(eq + 1)] as [string, string];
        }),
      );
      return {
        app: fields.get("app")!,
        amount: Number(fields.get("amt")!),
        currency: fields.get("cur")!,
        timestamp: Temporal.Instant.fromEpochMilliseconds(Number(fields.get("t")!) * 1000),
      };
    } catch (e) {
      log.warn("Unknown error validating token", e);
      return undefined;
    }
  }

  function sshPublicKeyToKeyObject(sshKey: string): crypto.KeyObject {
    const keyData = Buffer.from(sshKey.split(" ")[1], "base64");
    // SSH wire format: [uint32 type-length][type-string][uint32 key-length][raw-key]
    const typeLen = keyData.readUInt32BE(0);
    const keyLen = keyData.readUInt32BE(4 + typeLen);
    const rawKey = keyData.subarray(4 + typeLen + 4, 4 + typeLen + 4 + keyLen);
    return crypto.createPublicKey({
      key: { kty: "OKP", crv: "Ed25519", x: rawKey.toString("base64url") },
      format: "jwk",
    });
  }
}
