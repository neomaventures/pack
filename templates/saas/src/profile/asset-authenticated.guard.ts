import { getPrincipal } from "@neomaventures/auth"
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

/**
 * Guard for profile-scoped asset endpoints (`GET /profile/avatar`,
 * `POST /profile/avatar`).
 *
 * Identical in behaviour to `@neomaventures/auth`'s `Authenticated` guard
 * except that an unauthenticated request raises {@link NotFoundException}
 * (404) rather than {@link UnauthorizedException} (401) — asset endpoints
 * should not confirm the existence of a per-user resource to an
 * unauthenticated caller. Same reasoning as GitHub returning 404 for
 * private repositories: a 401 is itself a signal that the resource exists.
 *
 * The page route `/profile` keeps the standard `Authenticated` guard with
 * a redirect URL; only the asset endpoints under it use this guard.
 *
 * @example
 * ```typescript
 * @Get("profile/avatar")
 * @UseGuards(AssetAuthenticated)
 * public avatar(): Upload | null { ... }
 * ```
 */
@Injectable()
export class AssetAuthenticated implements CanActivate {
  /**
   * Allows the request through when an authenticated principal is present
   * on the request context; otherwise raises a 404.
   *
   * @param _context - The Nest execution context (unused).
   * @returns `true` when a principal is present.
   * @throws {NotFoundException} When no principal is on the request.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by CanActivate
  public canActivate(_context: ExecutionContext): boolean {
    if (!getPrincipal()) {
      throw new NotFoundException()
    }

    return true
  }
}
