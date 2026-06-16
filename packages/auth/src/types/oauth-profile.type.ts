/**
 * Provider-supplied profile data captured during an OAuth callback and
 * persisted on `Account.authProfile`.
 *
 * Each key is a provider name (e.g. `"google"`) mapping to a record of
 * provider-specific claims (such as `sub`, `name`, `picture`). The
 * `google` key has a well-known shape populated automatically by
 * `GoogleAuthService.authenticate()`. Additional providers can extend the
 * map with their own claim shapes.
 *
 * @example
 * ```typescript
 * const profile: OAuthProfile = {
 *   google: { sub: "1234567890", name: "Alice", picture: "https://..." },
 * }
 * ```
 */
export interface OAuthProfile {
  /** Google OAuth profile claims */
  google?: { sub: string; name?: string; picture?: string }
  /** Additional provider profiles */
  [provider: string]: Record<string, any> | undefined
}
