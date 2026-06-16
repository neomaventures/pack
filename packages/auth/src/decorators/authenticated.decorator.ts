import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common"

import { type OnUnauthenticated } from "../auth.options"
import { AuthenticatedGuard } from "../guards/authenticated.guard"

/**
 * Metadata key under which the per-route `onUnauthenticated` strategy is
 * stored by `@Authenticated()` for later retrieval by
 * {@link AuthenticatedGuard}.
 */
export const ON_UNAUTHENTICATED_KEY = "auth:on_unauthenticated"

/**
 * Options accepted by the `@Authenticated()` decorator.
 */
export interface AuthenticatedOptions {
  /**
   * Override the module-level `onUnauthenticated` default for this route.
   * See {@link OnUnauthenticated} for the accepted shapes.
   */
  onUnauthenticated?: OnUnauthenticated
}

/**
 * Marks a controller or handler as requiring an authenticated account.
 *
 * Applies the {@link AuthenticatedGuard} and stamps the per-route
 * unauthenticated strategy as metadata. Per-route strategy beats the
 * module-level default supplied to `AuthModule.forRoot({ onUnauthenticated })`.
 *
 * @param options - Per-route configuration. Omit to inherit the module
 *   default (or the built-in `UnauthorizedException` when no default is set).
 *
 * @example API route (returns 401 JSON when unauthenticated)
 * ```typescript
 * @Authenticated()
 * @Get("me")
 * public me(): UserResponse { ... }
 * ```
 *
 * @example Server-rendered route (redirects to login page)
 * ```typescript
 * @Authenticated({ onUnauthenticated: "/auth/magic-link" })
 * @Get("dashboard")
 * public dashboard(): string { ... }
 * ```
 *
 * @example Disguise an admin route as 404
 * ```typescript
 * @Authenticated({ onUnauthenticated: NotFoundException })
 * @Get("admin")
 * public admin(): AdminResponse { ... }
 * ```
 */
export function Authenticated(
  options?: AuthenticatedOptions,
): ClassDecorator & MethodDecorator {
  return applyDecorators(
    SetMetadata(ON_UNAUTHENTICATED_KEY, options?.onUnauthenticated),
    UseGuards(AuthenticatedGuard),
  )
}
