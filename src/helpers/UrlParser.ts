import { Step } from "@/models/Step";

export namespace UrlParser {
  /**
   * postgresql://user:pass@localhost:5432
   * postgres://user:pass@localhost:5432
   */
  export function postgresql(url: string): Step.DatabaseConnectionProperties {
    return parseDatabaseUrl(url, ["postgresql:", "postgres:"]);
  }

  /**
   * mariadb://user:pass@localhost:3306
   * mysql://user:pass@localhost:3306
   */
  export function mariadb(url: string): Step.DatabaseConnectionProperties {
    return parseDatabaseUrl(url, ["mariadb:", "mysql:"]);
  }

  /**
   * s3://ACCESS_KEY:SECRET_KEY@endpoint-host:port/bucket?region=us-east-1
   * s3://ACCESS_KEY:SECRET_KEY@endpoint-host:port/bucket?region=us-east-1&tls=false
   */
  export function s3(url: string): Step.S3ConnectionProperties {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "s3:") {
        throw new Error(`Invalid protocol: ${parsedUrl.protocol}. Expected 's3:'`);
      }
      const accessKey = decodeURIComponent(parsedUrl.username);
      const secretKey = decodeURIComponent(parsedUrl.password);
      if (!accessKey) {
        throw new Error("Access key is required in connection URL");
      }
      if (!secretKey) {
        throw new Error("Secret key is required in connection URL");
      }
      let host = parsedUrl.hostname;
      if (!host) {
        throw new Error("Host is required in connection URL");
      }
      if (host.startsWith("[") && host.endsWith("]")) {
        host = host.slice(1, -1);
      }
      const port = parsedUrl.port;
      const tls = parsedUrl.searchParams.get("tls");
      const scheme = tls === "false" ? "http" : "https";
      const endpoint = port ? `${scheme}://${host}:${port}` : `${scheme}://${host}`;
      const bucket = parsedUrl.pathname.replace(/^\//, "").split("/")[0];
      if (!bucket) {
        throw new Error("Bucket is required in connection URL (as path, e.g. s3://key:secret@host/bucket)");
      }
      const region = parsedUrl.searchParams.get("region") || undefined;
      return { accessKey, secretKey, endpoint, bucket, region };
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Invalid URL format: ${error.message}`);
      }
      throw error;
    }
  }

  function parseDatabaseUrl(url: string, allowedProtocols: string[]): Step.DatabaseConnectionProperties {
    try {
      const parsedUrl = new URL(url);
      // Validate protocol
      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        const expected = allowedProtocols.map((p) => `'${p}'`).join(" or ");
        throw new Error(`Invalid protocol: ${parsedUrl.protocol}. Expected ${expected}`);
      }
      // Extract user and password
      const user = decodeURIComponent(parsedUrl.username);
      const password = decodeURIComponent(parsedUrl.password);
      if (!user) {
        throw new Error("User is required in connection URL");
      }
      if (!password) {
        throw new Error("Password is required in connection URL");
      }
      // Extract host (strip brackets from IPv6 addresses)
      let host = parsedUrl.hostname;
      if (!host) {
        throw new Error("Host is required in connection URL");
      }
      // Remove brackets from IPv6 addresses
      if (host.startsWith("[") && host.endsWith("]")) {
        host = host.slice(1, -1);
      }
      // Extract port (if specified)
      const port = parsedUrl.port;
      return {
        user,
        password,
        host,
        port: port || undefined,
      };
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Invalid URL format: ${error.message}`);
      }
      throw error;
    }
  }
}
