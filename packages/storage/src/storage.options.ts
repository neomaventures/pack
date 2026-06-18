import { type Storable } from "./interfaces/storable.interface"

export const STORAGE_OPTIONS = Symbol("STORAGE_OPTIONS")
export const STORAGE_FEATURE_OPTIONS = Symbol("STORAGE_FEATURE_OPTIONS")

/**
 * Package-internal: resolved root storage options.
 *
 * Materialised in `StorageModule.forRoot` via `setExtras` with sensible
 * normalisation (e.g. `defaults` defaulting to `{}` so feature-scope
 * merges don't have to chain optional-chains). Not re-exported from the
 * root barrel — consumers configure via {@link StorageRootOptions} and
 * read via package-provided services.
 */
export const RESOLVED_STORAGE_OPTIONS = Symbol("RESOLVED_STORAGE_OPTIONS")

/**
 * Package-internal: resolved per-feature storage options.
 *
 * Materialised in `StorageModule.forFeature` by merging
 * {@link StorageRootOptions.defaults} with the feature's overrides and
 * applying package-level fallbacks for required fields. Injected by
 * `StorageService`, `UploadInterceptor`, and `TemporaryLinkInterceptor`
 * within each feature module instance.
 */
export const RESOLVED_FEATURE_STORAGE_OPTIONS = Symbol(
  "RESOLVED_FEATURE_STORAGE_OPTIONS",
)

/**
 * Package-level default for the presigned link expiry (seconds), used
 * when neither the feature nor the root defaults specify a value.
 */
export const DEFAULT_LINK_EXPIRES_IN = 3600

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
 *   accessKeyId: "minioadmin",
 *   secretAccessKey: "minioadmin",
 *   entity: Upload,
 *   defaults: { maxFileSize: 5 * 1024 * 1024 },
 * })
 * ```
 */
export interface StorageRootOptions<T extends Storable = Storable> {
  /** S3-compatible endpoint URL */
  endpoint: string
  /** AWS region */
  region: string
  /** AWS access key ID */
  accessKeyId: string
  /** AWS secret access key */
  secretAccessKey: string
  /** The entity class used for file metadata persistence */
  entity: new (...args: any[]) => T
  /** Use path-style URLs (required for MinIO, optional for AWS S3). Defaults to true. */
  forcePathStyle?: boolean
  /**
   * Package-level defaults for per-feature knobs. Any field here is
   * overridable in {@link StorageModule.forFeature}; an omitted feature
   * field falls back to the value here.
   */
  defaults?: {
    /** Default maximum file size in bytes for `@Upload()` routes. */
    maxFileSize?: number
    /** Default allowed MIME types for `@Upload()` routes. */
    allowedMimeTypes?: string[]
    /** Default presigned link expiration time in seconds. */
    linkExpiresIn?: number
    /**
     * Default `Cache-Control` header for `@TemporaryLink()` 302 redirects.
     * Passed verbatim to `res.setHeader("Cache-Control", ...)` — the package
     * does not parse or validate the value. Per-route
     * `@TemporaryLink({ cacheControl })` overrides this default. When neither
     * is set, no `Cache-Control` header is sent.
     */
    linkCacheControl?: string
  }
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

/**
 * Package-internal: the materialised root options shape. Today this is
 * structurally identical to {@link StorageRootOptions}, but stays a
 * distinct alias so future normalisation (e.g. defaulting `defaults` to
 * an empty object so feature merges don't have to chain optional-chains)
 * lives on this side of the boundary, not in consumer-facing types.
 */
export interface ResolvedStorageRootOptions<
  T extends Storable = Storable,
> extends Omit<StorageRootOptions<T>, "defaults"> {
  defaults: NonNullable<StorageRootOptions<T>["defaults"]>
}

/**
 * Package-internal: the materialised feature options shape consumed by
 * `StorageService`, `UploadInterceptor`, and `TemporaryLinkInterceptor`.
 *
 * Required fields (`bucket`, `maxFileSize`, `linkExpiresIn`) have been
 * resolved through the merge of feature overrides → root defaults →
 * package-level fallbacks. `allowedMimeTypes` and `linkCacheControl`
 * stay possibly-undefined because the package enforces no fallback for
 * them (absence means "no allow-list" / "no header").
 */
export interface ResolvedFeatureStorageOptions {
  bucket: string
  maxFileSize: number | undefined
  allowedMimeTypes: string[] | undefined
  linkExpiresIn: number
  linkCacheControl: string | undefined
}
