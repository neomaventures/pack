import { createParamDecorator } from "@nestjs/common"

import { type OAuthAuthenticatable } from "../interfaces/oauth-authenticatable.interface"
import { getPrincipal } from "../principal/principal.slot"
import { findActiveToken } from "../services/oauth-token.service"
import { type OAuthProvider } from "../types/oauth-provider.type"
import { type OAuthTokenSnapshot } from "../types/oauth-token-snapshot.type"

/**
 * Parameter decorator that resolves the active OAuth token snapshot for
 * the current principal. Equivalent to calling
 * `OAuthTokenService.getActiveToken(provider)` from a service — both
 * delegate to the shared `findActiveToken` resolver.
 *
 * Returns `null` when the principal is anonymous, has no stored tokens
 * for the provider, or the stored token has expired (refresh-on-expiry
 * lands in #171).
 *
 * Must be called with parentheses, supplying the provider name:
 * `@OAuthToken("google")`.
 *
 * @example
 * ```typescript
 * @Authenticated()
 * @Get("inbox/count")
 * public count(
 *   @OAuthToken("google") token: OAuthTokenSnapshot | null,
 * ): { count: number } {
 *   if (!token) return { count: 0 }
 *   return this.gmail.count(token.accessToken)
 * }
 * ```
 */
export const OAuthToken = createParamDecorator(
  (provider: OAuthProvider): OAuthTokenSnapshot | null => {
    const principal = getPrincipal() as OAuthAuthenticatable | undefined
    return findActiveToken(principal ?? null, provider)
  },
)
