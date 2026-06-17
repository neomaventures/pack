import { type OAuthAuthenticatable } from "../interfaces/oauth-authenticatable.interface"
import { type OAuthTokenable } from "../interfaces/oauth-tokenable.interface"
import { type OAuthProvider } from "../types/oauth-provider.type"
import { type OAuthTokenSnapshot } from "../types/oauth-token-snapshot.type"

/**
 * Returns the active OAuth token snapshot for the given provider on the
 * supplied account, or `null` when no non-expired token is on file.
 *
 * Standalone helper so that consumers with a custom `Authenticatable`
 * entity (one that does not inherit from the reference `Account` class)
 * can still resolve an active token without reimplementing the lookup
 * logic. The reference `Account.activeToken(provider)` is a thin wrapper
 * around this helper.
 *
 * Defensive about `expiresAt` typing — TypeORM normally hydrates it as a
 * `Date`, but JSON-serialised rows (e.g. cached responses or test
 * fixtures) can arrive as ISO strings. Both shapes are accepted and the
 * snapshot's `expiresAt` is always a `Date`.
 *
 * @param account - The account whose OAuth tokens should be inspected
 * @param provider - The OAuth provider key (e.g. `"google"`)
 * @returns A snapshot with `accessToken`, `expiresAt`, `scopes`, or
 *   `null` when no token exists for the provider or the stored token has
 *   expired
 *
 * @example
 * ```typescript
 * import { getActiveToken } from "@neomaventures/auth"
 *
 * const token = getActiveToken(account, "google")
 * if (token) {
 *   await fetch(url, {
 *     headers: { Authorization: `Bearer ${token.accessToken}` },
 *   })
 * }
 * ```
 */
export const getActiveToken = (
  account: OAuthAuthenticatable,
  provider: OAuthProvider,
): OAuthTokenSnapshot | null => {
  const tokens = account.oauthTokens
  if (!tokens || tokens.length === 0) {
    return null
  }

  const match = tokens.find(
    (token: OAuthTokenable): boolean => token.provider === provider,
  )
  if (!match) {
    return null
  }

  const expiresAt =
    match.expiresAt instanceof Date
      ? match.expiresAt
      : new Date(match.expiresAt)
  if (expiresAt.getTime() <= Date.now()) {
    return null
  }

  return {
    accessToken: match.accessToken,
    expiresAt,
    scopes: match.scopes,
  }
}
