import {
  applyDecorators,
  SetMetadata,
  type Type,
  UseInterceptors,
} from "@nestjs/common"

import { UploadInterceptor } from "../interceptors/upload.interceptor"
import {
  type StorageKeyResolver,
  type StorageKeyResolverFn,
} from "../interfaces/key-resolver.interface"

/**
 * Metadata key used to store upload options on the handler.
 */
export const UPLOAD_METADATA_KEY = "storage:upload"

/**
 * Options for the {@link Upload} decorator.
 */
export interface UploadOptions {
  /** Per-route maximum file size in bytes. Must be at or below the global `maxFileSize`. */
  maxSize?: number
  /** Per-route allowed MIME types. Narrows the global `allowedMimeTypes` via intersection. */
  types?: string[]
  /**
   * Custom key resolver — overrides the framework's default key generation.
   *
   * Accepts either:
   * - A {@link StorageKeyResolverFn} for stateless, pure naming policies, or
   * - A class implementing {@link StorageKeyResolver} when DI is needed
   *   (resolved from the DI container via `ModuleRef.get`, so the class must
   *   be registered as a provider in the consumer's module).
   *
   * The resolver receives `file.defaultKey` — the key the framework's default
   * resolver would have produced — so the common case is just to prefix it
   * with request context.
   */
  key?: StorageKeyResolverFn | Type<StorageKeyResolver>
}

/**
 * Method decorator that enables file upload handling on a controller route.
 *
 * Composes `SetMetadata` (to store upload options) and `UseInterceptors`
 * (to attach the {@link UploadInterceptor}).
 *
 * @param options - Upload configuration options
 * @returns A composed method decorator
 *
 * @example
 * ```typescript
 * @Post()
 * @Upload()
 * public async create(@StoredFile() file: Upload): Promise<Upload> {
 *   return file
 * }
 * ```
 *
 */
export function Upload(options: UploadOptions = {}): MethodDecorator {
  return applyDecorators(
    SetMetadata(UPLOAD_METADATA_KEY, options),
    UseInterceptors(UploadInterceptor),
  )
}
