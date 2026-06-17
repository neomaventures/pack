import { type Authenticatable } from "../interfaces/authenticatable.interface"
import { type OAuthTokenable } from "../interfaces/oauth-tokenable.interface"
import { type OAuthProvider } from "../types/oauth-provider.type"
import { type OAuthTokenSnapshot } from "../types/oauth-token-snapshot.type"

/**
 * Namespace-style service that groups OAuth token utilities for
 * `Authenticatable` entities.
 *
 * Not a NestJS provider. Never registered on a module, never injected,
 * never decorated with `@Injectable()`. Methods are static and called
 * directly — the class exists purely as a discoverable namespace that
 * matches the package's vocabulary (`@ActiveOAuthToken` decorator,
 * `Authenticatable` interface) and surfaces through autocomplete.
 *
 * Consumers with a custom `Authenticatable` entity call
 * `OAuthTokenService.getActiveToken(account, provider)` directly. The
 * reference `Account.activeToken(provider)` is a thin wrapper around the
 * same static method.
 *
 * @example
 * ```typescript
 * import { OAuthTokenService } from "@neomaventures/auth"
 *
 * const token = OAuthTokenService.getActiveToken(account, "google")
 * if (token) {
 *   await fetch(url, {
 *     headers: { Authorization: `Bearer ${token.accessToken}` },
 *   })
 * }
 * ```
 */
export class OAuthTokenService {
  /**
   * Returns the active OAuth token snapshot for the given provider on the
   * supplied account, or `null` when no non-expired token is on file.
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
   * const token = OAuthTokenService.getActiveToken(account, "google")
   * if (token) {
   *   await fetch(url, {
   *     headers: { Authorization: `Bearer ${token.accessToken}` },
   *   })
   * }
   * ```
   */
  public static getActiveToken(
    account: Authenticatable,
    provider: OAuthProvider,
  ): OAuthTokenSnapshot | null {
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
}
