import { createParamDecorator } from "@nestjs/common"

import { OAuthTokenService } from "../services/oauth-token.service"
import { type OAuthProvider } from "../types/oauth-provider.type"
import { type OAuthTokenSnapshot } from "../types/oauth-token-snapshot.type"

/**
 * Parameter decorator that resolves the active OAuth token snapshot for
 * the current principal. Equivalent to calling
 * `OAuthTokenService.getActiveToken(provider)` from a service — both
 * read the principal from the request-scoped context slot.
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
  (provider: OAuthProvider): OAuthTokenSnapshot | null =>
    OAuthTokenService.getActiveToken(provider),
)
