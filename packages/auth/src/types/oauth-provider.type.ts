/**
 * String union of OAuth providers whose tokens can be persisted via
 * `@neomaventures/auth`.
 *
 * Today the only supported provider is `"google"`. This union will grow
 * as new OAuth integrations land (e.g. GitHub, Microsoft).
 *
 * @example
 * ```typescript
 * const token = oauthTokens.getActiveToken("google" satisfies OAuthProvider)
 * ```
 */
export type OAuthProvider = "google"
