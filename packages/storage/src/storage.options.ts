import { type Storable } from "./interfaces/storable.interface"

export const STORAGE_OPTIONS = Symbol("STORAGE_OPTIONS")

/**
 * Configuration options for the Storage file storage module.
 *
 * @typeParam T - The entity class implementing Storable
 *
 * @example
 * ```typescript
 * StorageModule.forRoot({
 *   endpoint: "http://localhost:9000",
 *   region: "us-east-1",
 *   bucket: "uploads",
 *   accessKeyId: "minioadmin",
 *   secretAccessKey: "minioadmin",
 *   entity: Upload,
 * })
 * ```
 */
export interface StorageOptions<T extends Storable = Storable> {
  /** S3-compatible endpoint URL */
  endpoint: string
  /** AWS region */
  region: string
  /** S3 bucket name */
  bucket: string
  /** AWS access key ID */
  accessKeyId: string
  /** AWS secret access key */
  secretAccessKey: string
  /** The entity class used for file metadata persistence */
  entity: new () => T
  /** Maximum file size in bytes */
  maxFileSize?: number
  /** Allowed MIME types for uploads */
  allowedMimeTypes?: string[]
  /** Presigned link expiration time in seconds */
  linkExpiresIn?: number
  /** Use path-style URLs (required for MinIO, optional for AWS S3). Defaults to true. */
  forcePathStyle?: boolean
}
