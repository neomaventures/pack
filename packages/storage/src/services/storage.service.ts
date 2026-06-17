import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { Inject, Injectable } from "@nestjs/common"

import {
  InvalidStorageKeyException,
  MAX_KEY_BYTES,
} from "../exceptions/invalid-storage-key.exception"
import { type Storable } from "../interfaces/storable.interface"
import { S3_CLIENT } from "../providers/s3-client.provider"
import {
  type ResolvedFeatureStorageOptions,
  RESOLVED_FEATURE_STORAGE_OPTIONS,
} from "../storage.options"

/**
 * Thin wrapper around the AWS S3 client for storing objects and generating
 * presigned URLs. Key resolution is performed upstream by a
 * {@link StorageKeyResolver}; this service is responsible only for the
 * persistence boundary.
 *
 * @example
 * ```typescript
 * await storageService.store("01HXYZ-photo.jpg", buffer, "image/jpeg")
 * const url = await storageService.getSignedUrl("01HXYZ-photo.jpg")
 * ```
 *
 * The class is parametrised on `T extends Storable` so consumers narrow at
 * injection (`private readonly storage: StorageService<Upload>`); future
 * entity-touching methods will flow `T` through their return signatures
 * automatically. Today's methods operate on S3 bytes and don't carry `T`.
 */
@Injectable()
// Forward-looking generic: today's methods operate on S3 bytes and don't
// reference T, but the class-level parameter is the public contract so
// consumers can narrow at injection (`StorageService<Upload>`) and any
// entity-touching methods added later flow T through their signatures.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class StorageService<T extends Storable = Storable> {
  public constructor(
    @Inject(RESOLVED_FEATURE_STORAGE_OPTIONS)
    private readonly options: ResolvedFeatureStorageOptions,
    @Inject(S3_CLIENT) private readonly client: S3Client,
  ) {}

  /**
   * Stores a file in S3 at the given key.
   *
   * The key is validated for S3 compatibility before the network call:
   * non-empty and ≤ 1024 bytes when UTF-8 encoded. Other characters (slashes,
   * dots, traversal sequences) are S3-valid and pass through unchanged —
   * any policy on those belongs in the key resolver.
   *
   * @param key - The S3 object key, produced by a key resolver
   * @param body - The file content as a Buffer
   * @param contentType - The MIME type of the file
   * @throws {InvalidStorageKeyException} if the key is empty or exceeds 1024 bytes
   */
  public async store(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    if (!key) {
      throw new InvalidStorageKeyException(key, "empty")
    }
    if (Buffer.byteLength(key, "utf8") > MAX_KEY_BYTES) {
      throw new InvalidStorageKeyException(key, "too-long")
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    )
  }

  /**
   * Generates a presigned URL for downloading a file from S3.
   *
   * @param key - The S3 object key
   * @param expiresIn - URL expiration time in seconds (defaults to options.linkExpiresIn or 3600)
   * @returns A presigned download URL
   */
  public async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.options.bucket,
      Key: key,
    })
    return getSignedUrl(this.client, command, {
      expiresIn: expiresIn ?? this.options.linkExpiresIn,
    })
  }

  /**
   * The configured S3 bucket name.
   *
   * Exposed for programmatic (non-HTTP) entity creation paths — when a
   * consumer constructs a `Storable` entity outside the `@Upload()`
   * interceptor (e.g. seeders, background jobs, importers) it needs to
   * populate `Storable.bucket` to match the bucket this service writes to.
   *
   * @returns The configured S3 bucket name
   *
   * @example
   * ```typescript
   * const storable = repository.create({
   *   key: resolvedKey,
   *   bucket: storageService.bucket,
   *   contentType: "image/jpeg",
   *   size: buffer.byteLength,
   * })
   * await storageService.store(resolvedKey, buffer, "image/jpeg")
   * ```
   */
  public get bucket(): string {
    return this.options.bucket
  }
}
