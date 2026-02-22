import { describe, expect, it } from "bun:test";
import { UrlParser } from "./UrlParser";

describe("UrlParser", () => {
  describe(UrlParser.postgresql.name, () => {
    const successCases: Array<{
      url: string;
      expectation: {
        user: string;
        password: string;
        host: string;
        port?: string;
      };
    }> = [
      {
        url: "postgresql://kim:possible@magicalhost.com:9482/database",
        expectation: {
          user: "kim",
          password: "possible",
          host: "magicalhost.com",
          port: "9482",
        },
      },
      {
        url: "postgresql://user:pass@localhost:5432",
        expectation: {
          user: "user",
          password: "pass",
          host: "localhost",
          port: "5432",
        },
      },
      {
        url: "postgresql://user:pass@localhost",
        expectation: {
          user: "user",
          password: "pass",
          host: "localhost",
        },
      },
      {
        url: "postgres://user:pass@db.example.com:5433/mydb",
        expectation: {
          user: "user",
          password: "pass",
          host: "db.example.com",
          port: "5433",
        },
      },
      {
        url: "postgresql://admin:p%40ssw0rd%21@db-server.io:5432",
        expectation: {
          user: "admin",
          password: "p@ssw0rd!",
          host: "db-server.io",
          port: "5432",
        },
      },
      {
        url: "postgresql://my%2Buser:my%2Bpass@host.com",
        expectation: {
          user: "my+user",
          password: "my+pass",
          host: "host.com",
        },
      },
      {
        url: "postgresql://user:pass@192.168.1.100:5432",
        expectation: {
          user: "user",
          password: "pass",
          host: "192.168.1.100",
          port: "5432",
        },
      },
      {
        url: "postgresql://user:pass@[::1]:5432",
        expectation: {
          user: "user",
          password: "pass",
          host: "::1",
          port: "5432",
        },
      },
      {
        url: "postgresql://user:pass@[2001:db8::1]:5432/db",
        expectation: {
          user: "user",
          password: "pass",
          host: "2001:db8::1",
          port: "5432",
        },
      },
      {
        url: "postgresql://user:pass@host.com/database?sslmode=require",
        expectation: {
          user: "user",
          password: "pass",
          host: "host.com",
        },
      },
      {
        url: "postgres://user:pass@host.com:5432?sslmode=require&connect_timeout=10",
        expectation: {
          user: "user",
          password: "pass",
          host: "host.com",
          port: "5432",
        },
      },
    ];
    for (const { url, expectation } of successCases) {
      it(url, async () => {
        // when
        const parts = UrlParser.postgresql(url);
        // then
        expect(parts).toEqual(expectation);
      });
    }

    const errorCases: Array<{
      description: string;
      url: string;
      error: string;
    }> = [
      {
        description: "missing user",
        url: "postgresql://:password@host.com:5432",
        error: "User is required in connection URL",
      },
      {
        description: "missing password",
        url: "postgresql://user@host.com:5432",
        error: "Password is required in connection URL",
      },
      {
        description: "missing host",
        url: "postgresql://user:pass@:5432",
        error: "Invalid URL format",
      },
      {
        description: "invalid protocol",
        url: "mariadb://user:pass@host.com:3306",
        error: "Invalid protocol: mariadb:. Expected 'postgresql:' or 'postgres:'",
      },
      {
        description: "invalid URL",
        url: "not a url at all",
        error: "Invalid URL format",
      },
    ];
    for (const { description, url, error } of errorCases) {
      it(`error: ${description}`, async () => {
        // when
        const action = () => UrlParser.postgresql(url);
        // then
        expect(action).toThrow(error);
      });
    }
  });

  describe(UrlParser.mariadb.name, () => {
    const successCases: Array<{
      url: string;
      expectation: {
        user: string;
        password: string;
        host: string;
        port?: string;
      };
    }> = [
      {
        url: "mariadb://kim:possible@magicalhost.com:3306/database",
        expectation: {
          user: "kim",
          password: "possible",
          host: "magicalhost.com",
          port: "3306",
        },
      },
      {
        url: "mariadb://user:pass@localhost:3306",
        expectation: {
          user: "user",
          password: "pass",
          host: "localhost",
          port: "3306",
        },
      },
      {
        url: "mariadb://user:pass@localhost",
        expectation: {
          user: "user",
          password: "pass",
          host: "localhost",
        },
      },
      {
        url: "mariadb://user:pass@db.example.com:3307/mydb",
        expectation: {
          user: "user",
          password: "pass",
          host: "db.example.com",
          port: "3307",
        },
      },
      {
        url: "mariadb://admin:p%40ssw0rd%21@db-server.io:3306",
        expectation: {
          user: "admin",
          password: "p@ssw0rd!",
          host: "db-server.io",
          port: "3306",
        },
      },
      {
        url: "mariadb://my%2Buser:my%2Bpass@host.com",
        expectation: {
          user: "my+user",
          password: "my+pass",
          host: "host.com",
        },
      },
      {
        url: "mariadb://user:pass@192.168.1.100:3306",
        expectation: {
          user: "user",
          password: "pass",
          host: "192.168.1.100",
          port: "3306",
        },
      },
      {
        url: "mariadb://user:pass@[::1]:3306",
        expectation: {
          user: "user",
          password: "pass",
          host: "::1",
          port: "3306",
        },
      },
      {
        url: "mariadb://user:pass@[2001:db8::1]:3306/db",
        expectation: {
          user: "user",
          password: "pass",
          host: "2001:db8::1",
          port: "3306",
        },
      },
      {
        url: "mariadb://user:pass@host.com/database?ssl=true",
        expectation: {
          user: "user",
          password: "pass",
          host: "host.com",
        },
      },
      {
        url: "mysql://user:pass@localhost:3306/database",
        expectation: {
          user: "user",
          password: "pass",
          host: "localhost",
          port: "3306",
        },
      },
    ];
    for (const { url, expectation } of successCases) {
      it(url, async () => {
        // when
        const parts = UrlParser.mariadb(url);
        // then
        expect(parts).toEqual(expectation);
      });
    }

    const errorCases: Array<{
      description: string;
      url: string;
      error: string;
    }> = [
      {
        description: "missing user",
        url: "mariadb://:password@host.com:3306",
        error: "User is required in connection URL",
      },
      {
        description: "missing password",
        url: "mariadb://user@host.com:3306",
        error: "Password is required in connection URL",
      },
      {
        description: "missing host",
        url: "mariadb://user:pass@:3306",
        error: "Invalid URL format",
      },
      {
        description: "invalid protocol",
        url: "postgresql://user:pass@host.com:5432",
        error: "Invalid protocol: postgresql:. Expected 'mariadb:' or 'mysql:'",
      },
      {
        description: "invalid URL",
        url: "not a url at all",
        error: "Invalid URL format",
      },
    ];
    for (const { description, url, error } of errorCases) {
      it(`error: ${description}`, async () => {
        // when
        const action = () => UrlParser.mariadb(url);
        // then
        expect(action).toThrow(error);
      });
    }
  });

  describe(UrlParser.s3.name, () => {
    const successCases: Array<{
      url: string;
      expectation: {
        accessKey: string;
        secretKey: string;
        endpoint: string;
        bucket: string;
        region?: string;
      };
    }> = [
      {
        url: "s3://mykey:mysecret@s3.example.com/my-bucket",
        expectation: {
          accessKey: "mykey",
          secretKey: "mysecret",
          endpoint: "https://s3.example.com",
          bucket: "my-bucket",
        },
      },
      {
        url: "s3://mykey:mysecret@minio.example.com:9000/my-bucket",
        expectation: {
          accessKey: "mykey",
          secretKey: "mysecret",
          endpoint: "https://minio.example.com:9000",
          bucket: "my-bucket",
        },
      },
      {
        url: "s3://mykey:mysecret@s3.us-east-1.amazonaws.com/my-bucket?region=us-east-1",
        expectation: {
          accessKey: "mykey",
          secretKey: "mysecret",
          endpoint: "https://s3.us-east-1.amazonaws.com",
          bucket: "my-bucket",
          region: "us-east-1",
        },
      },
      {
        url: "s3://AKIAIOSFODNN7EXAMPLE:wJalrXUtnFEMI%2FK7MDENG%2FbPxRfiCYEXAMPLEKEY@s3.amazonaws.com/my-production-bucket?region=us-west-2",
        expectation: {
          accessKey: "AKIAIOSFODNN7EXAMPLE",
          secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
          endpoint: "https://s3.amazonaws.com",
          bucket: "my-production-bucket",
          region: "us-west-2",
        },
      },
      {
        url: "s3://AKIAIOSFODNN7EXAMPLE:secret@s3.eu-west-1.amazonaws.com/company-backups?region=eu-west-1",
        expectation: {
          accessKey: "AKIAIOSFODNN7EXAMPLE",
          secretKey: "secret",
          endpoint: "https://s3.eu-west-1.amazonaws.com",
          bucket: "company-backups",
          region: "eu-west-1",
        },
      },
      {
        url: "s3://mykey:mysecret@localhost:4566/my-bucket?tls=false",
        expectation: {
          accessKey: "mykey",
          secretKey: "mysecret",
          endpoint: "http://localhost:4566",
          bucket: "my-bucket",
        },
      },
      {
        url: "s3://mykey:mysecret@minio.local:9000/dev-bucket?region=us-east-1&tls=false",
        expectation: {
          accessKey: "mykey",
          secretKey: "mysecret",
          endpoint: "http://minio.local:9000",
          bucket: "dev-bucket",
          region: "us-east-1",
        },
      },
      {
        url: "s3://admin:p%40ssw0rd%21@s3.example.com/my-bucket",
        expectation: {
          accessKey: "admin",
          secretKey: "p@ssw0rd!",
          endpoint: "https://s3.example.com",
          bucket: "my-bucket",
        },
      },
      {
        url: "s3://mykey:mysecret@s3.eu-central-1.amazonaws.com/jessyworld-test",
        expectation: {
          accessKey: "mykey",
          secretKey: "mysecret",
          endpoint: "https://s3.eu-central-1.amazonaws.com",
          bucket: "jessyworld-test",
          region: "eu-central-1",
        },
      },
      {
        url: "s3://mykey:mysecret@s3.ap-southeast-1.amazonaws.com/my-bucket?region=us-west-2",
        expectation: {
          accessKey: "mykey",
          secretKey: "mysecret",
          endpoint: "https://s3.ap-southeast-1.amazonaws.com",
          bucket: "my-bucket",
          region: "us-west-2",
        },
      },
    ];
    for (const { url, expectation } of successCases) {
      it(url, async () => {
        // when
        const parts = UrlParser.s3(url);
        // then
        expect(parts).toEqual(expectation);
      });
    }

    const errorCases: Array<{
      description: string;
      url: string;
      error: string;
    }> = [
      {
        description: "missing access key",
        url: "s3://:mysecret@s3.example.com/my-bucket",
        error: "Access key is required in connection URL",
      },
      {
        description: "missing secret key",
        url: "s3://mykey@s3.example.com/my-bucket",
        error: "Secret key is required in connection URL",
      },
      {
        description: "missing bucket",
        url: "s3://mykey:mysecret@s3.example.com",
        error: "Bucket is required in connection URL",
      },
      {
        description: "missing host",
        url: "s3://mykey:mysecret@/my-bucket",
        error: "Invalid URL format",
      },
      {
        description: "invalid protocol",
        url: "http://mykey:mysecret@s3.example.com/my-bucket",
        error: "Invalid protocol: http:. Expected 's3:'",
      },
      {
        description: "invalid URL",
        url: "not a url at all",
        error: "Invalid URL format",
      },
    ];
    for (const { description, url, error } of errorCases) {
      it(`error: ${description}`, async () => {
        // when
        const action = () => UrlParser.s3(url);
        // then
        expect(action).toThrow(error);
      });
    }
  });
});
