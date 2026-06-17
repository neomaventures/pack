import { type Storable } from "./interfaces/storable.interface"

export const STORAGE_OPTIONS = Symbol("STORAGE_OPTIONS")

/**
 * Configuration options for the file storage module's root scope, supplied
 * via {@link StorageModule.forRoot}. Holds connection/credential settings
 * for the S3-compatible backend plus package-level defaults for limits
 * that per-feature scopes can override.
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
export interface StorageRootOptions<T extends Storable = Storable> {
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
  /**
   * Default `Cache-Control` header for `@TemporaryLink()` 302 redirects.
   * Passed verbatim to `res.setHeader("Cache-Control", ...)` — the package
   * does not parse or validate the value. Per-route
   * `@TemporaryLink({ cacheControl })` overrides this default. When neither
   * is set, no `Cache-Control` header is sent.
   */
  linkCacheControl?: string
  /** Use path-style URLs (required for MinIO, optional for AWS S3). Defaults to true. */
  forcePathStyle?: boolean
}

/**
 * @deprecated Use {@link StorageRootOptions} instead. Will be removed
 * in a subsequent minor per pre-1.0 semver. Kept temporarily so that
 * IDE-driven migrations don't require a single-commit rename across
 * every consumer.
 */
export type StorageOptions<T extends Storable = Storable> =
  StorageRootOptions<T>

/**
 * Configuration options for a per-feature storage scope. Imported via
 * {@link StorageModule.forFeature} from a feature module to bind the
 * feature's bucket and per-feature overrides for the limits inherited
 * from {@link StorageRootOptions.defaults}.
 *
 * Per-feature overrides merge over `forRoot.defaults` — a `forFeature`
 * that omits a field falls back to whatever `forRoot.defaults` set
 * (and to a package-level default beyond that).
 */
export interface StorageFeatureOptions {
  /** S3 bucket name. Required — there is no shorthand on forRoot. */
  bucket: string
  /** Per-feature override of the maximum upload size in bytes. */
  maxFileSize?: number
  /** Per-feature override of the allowed MIME types. */
  allowedMimeTypes?: string[]
  /** Per-feature override of the presigned link expiration (seconds). */
  linkExpiresIn?: number
  /** Per-feature override of the `Cache-Control` header for temporary links. */
  linkCacheControl?: string
}
