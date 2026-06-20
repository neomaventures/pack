/**
 * The host's bridge between mailbox and whatever auth/token storage system
 * the consumer app uses. Mailbox calls `getToken(account, scopes)` before
 * every Gmail API page; the host resolves a valid access token for the
 * given account and scope set.
 *
 * Generic over the account shape with a structural constraint — mailbox
 * only needs to know the account has an `id`. The host's real principal
 * type (e.g. `@neomaventures/auth`'s `Account`) satisfies this naturally;
 * no separate interface implementation required.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class AuthTokenAccessor implements TokenAccessor {
 *   public constructor(
 *     private readonly oauthTokens: OAuthTokenService,
 *   ) {}
 *
 *   public async getToken<T extends { id: unknown }>(
 *     account: T,
 *     scopes: string[],
 *   ): Promise<string> {
 *     if (!scopes.includes(GMAIL_READONLY_SCOPE)) {
 *       throw new Error("Unsupported scopes")
 *     }
 *     const token = await this.oauthTokens.getActiveToken(account.id, "google")
 *     return token.accessToken
 *   }
 * }
 * ```
 */
export interface TokenAccessor {
  /**
   * Resolve an access token for the given account and scope set.
   *
   * @param account - The host's principal; must have an `id` field. Mailbox
   *   uses this to identify which account's token to return.
   * @param scopes - The scope strings the token must cover. For v0.1.0
   *   mailbox only requests `GMAIL_READONLY_SCOPE`.
   * @returns A valid access token string.
   */
  getToken<T extends { id: unknown }>(
    account: T,
    scopes: string[],
  ): Promise<string>
}
