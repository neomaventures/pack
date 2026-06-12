import { applyDecorators, SetMetadata, UseInterceptors } from "@nestjs/common"

import { TemporaryLinkInterceptor } from "../interceptors/temporary-link.interceptor"

/**
 * Metadata key used to store temporary link options on the handler.
 */
export const TEMPORARY_LINK_METADATA_KEY = "storage:temporary-link"

/**
 * Options for {@link TemporaryLink}.
 */
export interface TemporaryLinkOptions {
  /**
   * URL expiration time in seconds. Defaults to
   * `StorageOptions.linkExpiresIn` (or 900 seconds if not configured).
   */
  expiresIn?: number

  /**
   * URL to redirect to with HTTP 302 when the handler returns `null` or
   * `undefined`. Used verbatim as the `Location` header — the package does
   * not validate the value, so consumers may pass a relative path, an
   * absolute URL, or another endpoint.
   *
   * Without this option, a `null` return is treated as a programmer error
   * and throws. `default` only covers the explicit no-asset path; malformed
   * entities and thrown exceptions still bubble up.
   */
  default?: string
}

/**
 * Method decorator that enables presigned URL redirect handling on a controller route.
 *
 * The handler must return an entity with a `key` property (implementing {@link Storable}),
 * or `null`/`undefined` when paired with a {@link TemporaryLinkOptions.default} URL.
 *
 * The interceptor generates a presigned S3 download URL and responds with HTTP 302.
 *
 * @param arg - Either a number (shorthand for `{ expiresIn }`) or a {@link TemporaryLinkOptions} object.
 * @returns A composed method decorator
 *
 * @example Default expiry
 * ```typescript
 * @Get(":id")
 * @TemporaryLink()
 * public async download(@Param("id") id: string): Promise<Upload> {
 *   return this.repo.findOneByOrFail({ id })
 * }
 * ```
 *
 * @example Custom expiry (10 minutes)
 * ```typescript
 * @Get(":id")
 * @TemporaryLink({ expiresIn: 600 })
 * public async download(@Param("id") id: string): Promise<Upload> {
 *   return this.repo.findOneByOrFail({ id })
 * }
 * ```
 *
 * @example Default URL when the handler has no asset to serve
 * ```typescript
 * @Get("avatar")
 * @TemporaryLink({ default: "/img/default-avatar.svg" })
 * public async avatar(@CurrentUser() user: User): Promise<Upload | null> {
 *   return this.profile.getAvatar(user.id)
 * }
 * ```
 */
export function TemporaryLink(expiresIn?: number): MethodDecorator
export function TemporaryLink(options: TemporaryLinkOptions): MethodDecorator
export function TemporaryLink(
  arg?: number | TemporaryLinkOptions,
): MethodDecorator {
  const options: TemporaryLinkOptions =
    typeof arg === "number" ? { expiresIn: arg } : (arg ?? {})
  return applyDecorators(
    SetMetadata(TEMPORARY_LINK_METADATA_KEY, options),
    UseInterceptors(TemporaryLinkInterceptor),
  )
}
