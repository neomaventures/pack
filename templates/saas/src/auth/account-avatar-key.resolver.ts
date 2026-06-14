import { getPrincipal } from "@neomaventures/auth"
import {
  type OriginalFileInfo,
  type StorageIdGenerator,
  type StorageKeyResolver,
} from "@neomaventures/storage"
import { Injectable, UnauthorizedException } from "@nestjs/common"
import { type Request } from "express"

/**
 * Resolves the S3 object key for the authenticated account's avatar.
 *
 * Returns a stable per-account key in the form `accounts/${accountId}/avatar`.
 * The key is intentionally deterministic so that a second upload overwrites
 * the first in S3 — no orphan objects, no per-version keys to garbage
 * collect, and a single FK on `Account` is always pointing at the live
 * object.
 *
 * The handler is guarded by `Authenticated` so the principal is always
 * present by the time this resolver runs. A missing principal would
 * indicate a guard misconfiguration upstream and is treated as a 401.
 *
 * @example
 * ```typescript
 * @Post("profile/avatar")
 * @UseGuards(Authenticated)
 * @Upload({ key: AccountAvatarKeyResolver })
 * public upload(): void {}
 * ```
 */
@Injectable()
export class AccountAvatarKeyResolver implements StorageKeyResolver {
  /**
   * Builds the per-account avatar key.
   *
   * @param _req - The Express request (unused; principal comes from
   *   `getPrincipal()` which reads from the request-scoped context).
   * @param _idGenerator - Ignored — the key is stable per account so no
   *   random component is needed.
   * @param _file - Ignored — `file.defaultKey` is not used because we
   *   want overwrite-on-replace semantics.
   * @returns `accounts/${accountId}/avatar`.
   * @throws {UnauthorizedException} If no authenticated principal is set
   *   on the request context.
   */
  /* eslint-disable @typescript-eslint/no-unused-vars -- signature dictated by StorageKeyResolver */
  public resolve(
    _req: Request,
    _idGenerator: StorageIdGenerator,
    _file: OriginalFileInfo & { defaultKey: string },
  ): string {
    /* eslint-enable @typescript-eslint/no-unused-vars */
    const principal = getPrincipal()

    if (!principal) {
      throw new UnauthorizedException()
    }

    return `accounts/${principal.id as string}/avatar`
  }
}
