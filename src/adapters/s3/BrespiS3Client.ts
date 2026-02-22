import {
  S3Client as AWSS3Client,
  DeleteObjectsCommand,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

export class BrespiS3Client {
  private readonly awsClient: AWSS3Client;

  public constructor(public readonly options: Bun.S3Options) {
    this.awsClient = new AWSS3Client({
      endpoint: options.endpoint,
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId!,
        secretAccessKey: options.secretAccessKey!,
      },
      forcePathStyle: true,
    });
  }

  public file(path: string): BrespiS3Client.FileRef {
    return new BrespiS3Client.FileRef(this.awsClient, this.options.bucket!, path);
  }

  public async write(path: string, content: string | Blob): Promise<void> {
    const body = content instanceof Blob ? Buffer.from(await content.arrayBuffer()) : content;
    await this.awsClient.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: path,
        Body: body,
      }),
    );
  }

  public async list(options: {
    prefix?: string;
    maxKeys?: number;
    startAfter?: string;
  }): Promise<{ contents: Array<{ key: string }>; isTruncated: boolean }> {
    const result = await this.awsClient.send(
      new ListObjectsV2Command({
        Bucket: this.options.bucket,
        Prefix: options.prefix,
        MaxKeys: options.maxKeys,
        StartAfter: options.startAfter,
      }),
    );
    return {
      contents: (result.Contents || []).map((item) => ({ key: item.Key! })),
      isTruncated: result.IsTruncated ?? false,
    };
  }

  public async listAllKeys({ prefix }: { prefix?: string } = {}) {
    const batchSize = 1000;
    const keys: string[] = [];
    let startAfter: string | undefined;
    while (true) {
      let response;
      try {
        response = await this.list({
          prefix,
          maxKeys: batchSize,
          ...(startAfter ? { startAfter } : {}),
        });
      } catch (e) {
        throw new Error(`Failed to list bucket keys; bucket=${this.options.bucket}, prefix=${prefix}`);
      }
      const newKeys = (response.contents || []).map(({ key }) => key);
      keys.push(...newKeys);
      if (response.isTruncated) {
        const lastKey = newKeys.at(-1);
        if (lastKey) {
          startAfter = lastKey;
          continue;
        } else {
          throw new Error(`S3 list was truncated, but returned no keys; bucket=${this.options.bucket}, prefix=${prefix}`);
        }
      }
      break;
    }
    return keys;
  }

  public async deleteAll({ keys }: { keys: string[] }) {
    const batchSize = 100;
    const errors: Array<{ key: string; code: string }> = [];
    // Delete in batches
    for (let batchIndex = 0; true; batchIndex++) {
      const batch = keys.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
      if (batch.length === 0) {
        break;
      }
      const result = await this.awsClient.send(
        new DeleteObjectsCommand({
          Bucket: this.options.bucket,
          Delete: {
            Objects: batch.map((Key) => ({ Key })),
            Quiet: true,
          },
        }),
      );
      if (result.Errors?.length) {
        for (const err of result.Errors) {
          errors.push({
            key: err.Key!,
            code: err.Code!,
          });
        }
      }
    }
    // Check for errors
    if (errors.length > 0) {
      const details = {
        errorsTruncated: errors.length > 10,
        errorCount: errors.length,
        errors: errors.slice(0, 10),
      };
      throw new Error(`S3 batch deletion (partially) failed; ${JSON.stringify(details, null, 2)}`);
    }
  }
}

export namespace BrespiS3Client {
  export class FileRef {
    constructor(
      private readonly awsClient: AWSS3Client,
      private readonly bucket: string,
      private readonly key: string,
    ) {}

    async exists(): Promise<boolean> {
      try {
        await this.awsClient.send(
          new HeadObjectCommand({
            Bucket: this.bucket,
            Key: this.key,
          }),
        );
        return true;
      } catch {
        return false;
      }
    }

    async text(): Promise<string> {
      const result = await this.awsClient.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: this.key,
        }),
      );
      return await result.Body!.transformToString();
    }

    async arrayBuffer(): Promise<ArrayBuffer> {
      const result = await this.awsClient.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: this.key,
        }),
      );
      const bytes = await result.Body!.transformToByteArray();
      return bytes.buffer as ArrayBuffer;
    }
  }
}
