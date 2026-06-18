import { S3Client } from "@aws-sdk/client-s3"
import { type FactoryProvider } from "@nestjs/common"

import { type StorageRootOptions, STORAGE_OPTIONS } from "../storage.options"

/**
 * DI token for the shared `S3Client` instance.
 *
 * Package-internal: consumer code does not inject this directly. It is the
 * shared connection point that feature-scoped services use so the SDK's
 * connection pool is not fragmented across every `forFeature` registration.
 *
 * Never instantiate `S3Client` outside of {@link S3ClientProvider}.
 */
export const S3_CLIENT = Symbol("S3_CLIENT")

/**
 * Root-scoped factory provider for the singleton `S3Client`.
 *
 * The client is constructed once at module bootstrap from
 * {@link StorageRootOptions} and reused for every storage operation across
 * the application. Feature-scoped services in subsequent slices inject
 * `S3_CLIENT` rather than constructing their own client — this is what
 * justifies pulling the instantiation out of `StorageService`.
 *
 * @example
 * ```typescript
 * // Inside a service:
 * public constructor(@Inject(S3_CLIENT) private readonly s3: S3Client) {}
 * ```
 */
export const S3ClientProvider: FactoryProvider<S3Client> = {
  provide: S3_CLIENT,
  inject: [STORAGE_OPTIONS],
  useFactory: (options: StorageRootOptions): S3Client =>
    new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      forcePathStyle: options.forcePathStyle ?? true,
      // Suppress default SDK v3 checksum computation which can fail on some
      // S3-compatible backends (notably MinIO).
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    }),
}
