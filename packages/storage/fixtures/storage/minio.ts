import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3"

/**
 * MinIO client helper for test assertions.
 *
 * Reads STORAGE_* env vars set by the custom globalSetup in
 * `fixtures/specs/global-setup.ts`.
 */
export class MinioClient {
  private readonly client: S3Client

  public constructor(
    private readonly endpoint: string = process.env.STORAGE_ENDPOINT ??
      "http://localhost:9000",
    private readonly bucket: string = process.env.STORAGE_BUCKET ??
      "test-bucket",
  ) {
    this.client = new S3Client({
      endpoint,
      region: process.env.STORAGE_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY ?? "minioadmin",
        secretAccessKey: process.env.STORAGE_SECRET_KEY ?? "minioadmin",
      },
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    })
  }

  /**
   * Counts the number of objects in the bucket, optionally filtered by prefix.
   *
   * @param prefix - Optional key prefix to filter by
   * @returns The number of objects
   */
  public async countObjects(prefix?: string): Promise<number> {
    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      }),
    )
    return response.KeyCount ?? 0
  }

  /**
   * Retrieves a file from MinIO and returns its body as a string
   * along with the content type.
   *
   * @param key - The S3 object key
   * @returns The file body and content type
   */
  public async getObject(
    key: string,
  ): Promise<{ body: string; contentType: string }> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    )
    const body = await response.Body!.transformToString()
    return {
      body,
      contentType: response.ContentType ?? "",
    }
  }
}
