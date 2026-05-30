import { type Request } from "express"

import { type StorageIdGenerator } from "./id-generator.interface"

/**
 * Information about the uploaded file, as parsed by the multipart middleware.
 */
export interface OriginalFileInfo {
  /** Original filename as provided by the client */
  originalName: string
  /** MIME type of the uploaded file */
  mimeType: string
  /** File size in bytes */
  size: number
}

/**
 * Function signature for resolving the S3 object key for an uploaded file.
 *
 * Custom resolvers receive `file.defaultKey` — the key the framework's default
 * resolver would have produced. Decorate it with context (user id, tenant id,
 * path prefix) or ignore it and build a key from scratch using `file.originalName`.
 *
 * Use the function form when your resolver is a pure naming policy with no DI needs:
 *
 * @example Decorate the default key
 * ```typescript
 * @Upload({
 *   key: (req, idGenerator, file) =>
 *     `users/${req.params.userId}/${file.defaultKey}`,
 * })
 * public uploadAvatar() {}
 * ```
 *
 * @example Build a key from scratch
 * ```typescript
 * @Upload({
 *   key: (req, idGenerator, file) =>
 *     `${req.params.userId}/${idGenerator.generate()}.${file.mimeType.split("/")[1]}`,
 * })
 * public uploadAvatar() {}
 * ```
 */
export type StorageKeyResolverFn = (
  req: Request,
  idGenerator: StorageIdGenerator,
  file: OriginalFileInfo & { defaultKey: string },
) => string

/**
 * Resolves the S3 object key for an uploaded file.
 *
 * Implement this interface and pass the class to `@Upload({ key: MyKeyResolver })`
 * to customise how object keys are generated. The class is resolved from the
 * NestJS DI container, so it may inject any available provider.
 *
 * **Important:** `resolve` must be declared as a method, not as an arrow
 * property initializer (`resolve = () => ...`), so the framework can
 * distinguish class resolvers from function resolvers at runtime.
 *
 * Prefer {@link StorageKeyResolverFn} for stateless resolvers without DI needs.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class AvatarKeyResolver implements StorageKeyResolver {
 *   public constructor(private readonly config: ConfigService) {}
 *
 *   public resolve(
 *     req: Request,
 *     idGenerator: StorageIdGenerator,
 *     file: OriginalFileInfo & { defaultKey: string },
 *   ): string {
 *     const prefix = this.config.get("AVATAR_PREFIX")
 *     return `${prefix}/${req.params.userId}/${file.defaultKey}`
 *   }
 * }
 * ```
 */
export interface StorageKeyResolver {
  resolve: StorageKeyResolverFn
}
