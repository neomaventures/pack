import { Injectable } from "@nestjs/common"

import { type OAuthAuthenticatable } from "../interfaces/oauth-authenticatable.interface"
import { type OAuthTokenable } from "../interfaces/oauth-tokenable.interface"
import { getPrincipal } from "../principal/principal.slot"
import { type OAuthProvider } from "../types/oauth-provider.type"
import { type OAuthTokenSnapshot } from "../types/oauth-token-snapshot.type"

/**
 * Pure resolver for the active OAuth token snapshot belonging to a
 * principal. Lives outside the service so both the service and the
 * `@OAuthToken()` parameter decorator can share a single implementation
 * (parameter decorators cannot resolve injectables from the DI graph).
 *
 * Returns `null` when the principal is anonymous, has no stored tokens,
 * has no token for the requested provider, or the stored token has
 * expired. The returned snapshot intentionally omits `refreshToken`.
 *
 * @param principal - The current principal, or `null` when anonymous.
 * @param provider - The OAuth provider key (e.g. `"google"`).
 * @returns A sanitised snapshot, or `null`.
 */
export const findActiveToken = (
  principal: OAuthAuthenticatable | null | undefined,
  provider: OAuthProvider,
): OAuthTokenSnapshot | null => {
  if (!principal) {
    return null
  }

  const tokens = principal.oauthTokens
  if (!tokens || tokens.length === 0) {
    return null
  }

  const match = tokens.find(
    (token: OAuthTokenable): boolean => token.provider === provider,
  )
  if (!match) {
    return null
  }

  // `expiresAt` is normally a Date when hydrated by TypeORM, but be
  // defensive: a JSON-serialised row (e.g. from a cache or a unit-test
  // fixture) can arrive as a string.
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

/**
 * Resolves the active OAuth token for the current principal.
 *
 * Reads the principal from the request-scoped context slot (the same
 * slot that backs `getPrincipal()` and `@Principal()`) and delegates to
 * the pure `findActiveToken` helper. Returns a sanitised snapshot —
 * `refreshToken` is intentionally omitted.
 *
 * Refresh-on-expiry is not implemented in this slice (#171). When the
 * stored token's `expiresAt` is in the past, this returns `null`.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class GmailService {
 *   public constructor(private readonly oauthTokens: OAuthTokenService) {}
 *
 *   public async list(): Promise<GmailMessage[]> {
 *     const token = this.oauthTokens.getActiveToken("google")
 *     if (!token) throw new Error("No active Google token")
 *     return fetchGmail(token.accessToken)
 *   }
 * }
 * ```
 */
@Injectable()
export class OAuthTokenService {
  /**
   * Returns the active OAuth token snapshot for the given principal, or
   * `null` when no usable token exists. Stateless — does not consult
   * the request context.
   *
   * @param principal - The principal to inspect, or `null`.
   * @param provider - The OAuth provider to look up (e.g. `"google"`).
   * @returns A snapshot with `accessToken`, `expiresAt`, `scopes` — or
   *   `null` if the principal is anonymous, has no tokens, has no
   *   token for the provider, or the stored token has expired.
   */
  public getActiveTokenFor(
    principal: OAuthAuthenticatable | null,
    provider: OAuthProvider,
  ): OAuthTokenSnapshot | null {
    return findActiveToken(principal, provider)
  }

  /**
   * Returns the active OAuth token snapshot for the current principal
   * resolved from the request-scoped context slot.
   *
   * @param provider - The OAuth provider to look up (e.g. `"google"`).
   * @returns A snapshot or `null` (see {@link getActiveTokenFor}).
   */
  public getActiveToken(provider: OAuthProvider): OAuthTokenSnapshot | null {
    const principal = getPrincipal() as OAuthAuthenticatable | undefined
    return this.getActiveTokenFor(principal ?? null, provider)
  }
}
