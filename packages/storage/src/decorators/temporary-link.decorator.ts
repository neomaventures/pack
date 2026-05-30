import { applyDecorators, SetMetadata, UseInterceptors } from "@nestjs/common"

import { TemporaryLinkInterceptor } from "../interceptors/temporary-link.interceptor"

/**
 * Metadata key used to store temporary link options on the handler.
 */
export const TEMPORARY_LINK_METADATA_KEY = "storage:temporary-link"

/**
 * Method decorator that enables presigned URL redirect handling on a controller route.
 *
 * The handler must return an entity with a `key` property (implementing {@link Storable}).
 * The interceptor generates a presigned S3 download URL and responds with HTTP 302.
 *
 * @param expiresIn - Optional URL expiration time in seconds. Defaults to
 *   `StorageOptions.linkExpiresIn` (or 900 seconds if not configured).
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
 * @TemporaryLink(600)
 * public async download(@Param("id") id: string): Promise<Upload> {
 *   return this.repo.findOneByOrFail({ id })
 * }
 * ```
 */
export function TemporaryLink(expiresIn?: number): MethodDecorator {
  return applyDecorators(
    SetMetadata(TEMPORARY_LINK_METADATA_KEY, { expiresIn }),
    UseInterceptors(TemporaryLinkInterceptor),
  )
}
