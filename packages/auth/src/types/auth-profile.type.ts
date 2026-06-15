/**
 * Provider-specific profile data stored on `Account.authProfile`.
 *
 * Each key is a provider name (e.g., `"google"`) mapping to a record of
 * provider-specific claims. The `google` key has a well-known shape that
 * is populated automatically by `GoogleAuthService.authenticate()`.
 *
 * @example
 * ```typescript
 * const profile: AuthenticatableProfile = {
 *   google: { sub: "1234567890", name: "Alice", picture: "https://..." },
 * }
 * ```
 */
export interface AuthenticatableProfile {
  /** Google OAuth profile claims */
  google?: { sub: string; name?: string; picture?: string }
  /** Additional provider profiles */
  [provider: string]: Record<string, any> | undefined
}
