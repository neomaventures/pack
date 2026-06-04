import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Optional,
  UnauthorizedException,
} from "@nestjs/common"

import { UnauthorizedRedirectException } from "../exceptions/unauthorized-redirect.exception"
import { getPrincipal } from "../principal/principal.slot"

/**
 * Guard that only allows access to a [Controller](https://docs.nestjs.com/controllers)
 * if there is an authenticated principal.
 *
 * It is recommended to use this in conjunction with the {@link BearerAuthenticationMiddleware}
 * and {@link CookieAuthenticationMiddleware} which populate the principal context slot
 * when there is an authenticated session.
 *
 * @example API usage (returns 401 JSON)
 * ```typescript
 * @UseGuards(Authenticated)
 * @Get("me")
 * public me() {}
 * ```
 *
 * @example Server-rendered usage (redirects to login page)
 * ```typescript
 * @UseGuards(new Authenticated("/auth/magic-link"))
 * @Get("dashboard")
 * public dashboard() {}
 * ```
 */
@Injectable()
export class Authenticated implements CanActivate {
  /**
   * @param redirectUrl - Optional URL to redirect unauthenticated users to.
   *   When provided, throws {@link UnauthorizedRedirectException} instead of a plain
   *   {@link UnauthorizedException}. The exception is still a 401 but carries redirect
   *   metadata via `getRedirect()` that an exception filter may use to issue an HTTP
   *   redirect for browser-based requests.
   */
  public constructor(@Optional() private readonly redirectUrl?: string) {}

  /**
   * Returns `true` if a principal exists in the request context, allowing
   * request handling to proceed. Throws if no principal is found.
   *
   * Reads from the ALS-backed principal slot via `getPrincipal()`.
   *
   * @returns `true` if a principal is present.
   *
   * @throws {UnauthorizedException} If no principal is found.
   * @throws {UnauthorizedRedirectException} If no principal is found and a redirect URL was provided.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Required by CanActivate interface
  public canActivate(_context: ExecutionContext): boolean {
    if (!getPrincipal()) {
      if (this.redirectUrl) {
        throw new UnauthorizedRedirectException(
          this.redirectUrl,
          HttpStatus.SEE_OTHER,
        )
      }

      throw new UnauthorizedException(
        "Unable to authenticate a principal. Please check the documentation for accepted authentication methods",
      )
    }

    return true
  }
}
