import { createParamDecorator } from "@nestjs/common"

import { getAccount } from "../account/account.slot"
import { type OAuthAuthenticatable } from "../interfaces/oauth-authenticatable.interface"
import { OAuthTokenService } from "../services/oauth-token.service"
import { type OAuthProvider } from "../types/oauth-provider.type"
import { type OAuthTokenSnapshot } from "../types/oauth-token-snapshot.type"

/**
 * Parameter decorator that resolves the active OAuth token snapshot for
 * the current account. Delegates to {@link OAuthTokenService.getActiveToken}
 * against the `Authenticatable` in the request slot, so it works
 * uniformly for the reference `Account` entity and custom consumer
 * entities alike.
 *
 * Returns `null` when the account is anonymous, has no stored tokens
 * for the provider, or the stored token has expired (refresh-on-expiry
 * lands in a follow-up issue).
 *
 * Must be called with parentheses, supplying the provider name:
 * `@ActiveOAuthToken("google")`. The name is deliberately verbose to
 * avoid colliding with the `OAuthToken` entity class and to make the
 * intent obvious at the call site.
 *
 * @example
 * ```typescript
 * @Authenticated()
 * @Get("inbox/count")
 * public count(
 *   @ActiveOAuthToken("google") token: OAuthTokenSnapshot | null,
 * ): { count: number } {
 *   if (!token) return { count: 0 }
 *   return this.gmail.count(token.accessToken)
 * }
 * ```
 */
export const ActiveOAuthToken = createParamDecorator(
  (provider: OAuthProvider): OAuthTokenSnapshot | null => {
    const account = getAccount<OAuthAuthenticatable>()
    if (!account) {
      return null
    }
    return OAuthTokenService.getActiveToken(account, provider)
  },
)
