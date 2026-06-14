import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import {
  type AuthOptions,
  AUTH_OPTIONS,
  type OnUnauthenticated,
} from "../auth.options"
import { ON_UNAUTHENTICATED_KEY } from "../decorators/authenticated.decorator"
import { UnauthorizedRedirectException } from "../exceptions/unauthorized-redirect.exception"
import { getPrincipal } from "../principal/principal.slot"

const UNAUTHENTICATED_MESSAGE =
  "Unable to authenticate a principal. Please check the documentation for accepted authentication methods"

const ACCESS_DENIED_MESSAGE = "Request unauthenticated — access denied"

/**
 * Guard wired up by the `@Authenticated()` decorator that gates a route
 * behind the presence of an authenticated principal in the ALS-backed
 * request context.
 *
 * Resolution order for the unauthenticated response:
 *
 * 1. Per-route metadata supplied via `@Authenticated({ onUnauthenticated })`
 * 2. Module-level default supplied via `AuthModule.forRoot({ onUnauthenticated })`
 * 3. Built-in `UnauthorizedException` (401 JSON)
 *
 * Strategy resolution for a non-null value:
 *
 * - `string` → `UnauthorizedRedirectException(url, 303)` so a filter may
 *   issue an HTTP redirect for browser requests.
 * - `HttpException` subclass → instantiated with a fixed access-denied
 *   message and thrown.
 */
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    @Inject(AUTH_OPTIONS) private readonly options: AuthOptions,
  ) {}

  /**
   * Allows the request when a principal is present; otherwise throws
   * according to the strategy resolved from per-route metadata or the
   * module-level default.
   *
   * @param context - Execution context providing handler + class metadata.
   * @returns `true` if a principal is present.
   *
   * @throws {UnauthorizedException} When no strategy is configured.
   * @throws {UnauthorizedRedirectException} When a redirect string is configured.
   * @throws {HttpException} When an exception class is configured.
   */
  public canActivate(context: ExecutionContext): boolean {
    if (getPrincipal()) {
      return true
    }

    const strategy = this.resolveStrategy(context)

    if (typeof strategy === "string") {
      throw new UnauthorizedRedirectException(strategy, HttpStatus.SEE_OTHER)
    }

    if (strategy) {
      throw new strategy(ACCESS_DENIED_MESSAGE)
    }

    throw new UnauthorizedException(UNAUTHENTICATED_MESSAGE)
  }

  private resolveStrategy(
    context: ExecutionContext,
  ): OnUnauthenticated | undefined {
    const metadata = this.reflector.getAllAndOverride<
      OnUnauthenticated | undefined
    >(ON_UNAUTHENTICATED_KEY, [context.getHandler(), context.getClass()])

    if (metadata !== undefined) {
      return metadata
    }

    return this.options.onUnauthenticated
  }
}
