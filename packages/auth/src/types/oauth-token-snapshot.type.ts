/**
 * Read-only view of an active OAuth token, exposed to consumers via
 * `OAuthTokenService.getActiveToken()` and the `@OAuthToken()` parameter
 * decorator.
 *
 * `refreshToken` is intentionally omitted — it is internal to the auth
 * package's future refresh logic (see #171). Consumers never need to
 * see it, and keeping it out of the snapshot makes it impossible to
 * leak by accident through controllers or templates.
 *
 * @example
 * ```typescript
 * const token: OAuthTokenSnapshot | null = oauthTokens.getActiveToken("google")
 * if (token) {
 *   await fetch("https://gmail.googleapis.com/...", {
 *     headers: { Authorization: `Bearer ${token.accessToken}` },
 *   })
 * }
 * ```
 */
export interface OAuthTokenSnapshot {
  /** The current access token issued by the provider. */
  accessToken: string
  /** Absolute expiry of the access token. */
  expiresAt: Date
  /** OAuth scopes granted by the user at consent time. */
  scopes: string[]
}
