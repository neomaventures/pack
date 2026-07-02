/**
 * The host's bridge between mailbox and whatever auth/token storage system
 * the consumer app uses. Mailbox calls `getToken(scope)` before every Gmail
 * API page; the host resolves a valid access token for the given scope.
 *
 * Mailbox does **not** pass an account, principal, or any other "for whom"
 * identifier. Application concerns (which user the current request belongs
 * to) belong at the application level — the adapter resolves that itself
 * via ambient request context. The canonical mechanism in the pack is
 * `@neomaventures/request-context`, which exposes an `AsyncLocalStorage`-
 * backed request slot accessible from anywhere below the controller
 * boundary. Mailbox does not depend on it; consumers wire it in.
 *
 * @example
 * ```typescript
 * import { getRequest } from "@neomaventures/request-context"
 *
 * @Injectable()
 * export class AuthTokenAccessor implements TokenAccessor {
 *   public constructor(
 *     private readonly oauthTokens: OAuthTokenService,
 *   ) {}
 *
 *   public async getToken(scope: string): Promise<string> {
 *     if (scope !== GMAIL_READONLY_SCOPE) {
 *       throw new Error(`Unsupported scope: ${scope}`)
 *     }
 *     const account = getRequest()?.account
 *     if (!account) {
 *       throw new Error("No authenticated account on the current request")
 *     }
 *     const token = await this.oauthTokens.getActiveToken(account.id, "google")
 *     return token.accessToken
 *   }
 * }
 * ```
 */
export interface TokenAccessor {
  /**
   * Resolve an access token covering the given scope.
   *
   * @param scope - The OAuth scope string the token must cover. For v0.1.0
   *   mailbox only requests {@link GMAIL_READONLY_SCOPE}.
   * @returns A valid access token string.
   */
  getToken(scope: string): Promise<string>
}
