/**
 * The host's bridge between mailbox and whatever auth/token storage system
 * the consumer app uses. Mailbox calls `getToken(scope)` before every Gmail
 * API page; the host resolves a token — or signals absence — for the given
 * scope.
 *
 * Mailbox does **not** pass an account, principal, or any other "for whom"
 * identifier. Application concerns (which user the current request belongs
 * to) belong at the application level — the adapter resolves that itself
 * via ambient request context. The canonical mechanism in the pack is
 * `@neomaventures/request-context`, which exposes an `AsyncLocalStorage`-
 * backed request slot accessible from anywhere below the controller
 * boundary. Mailbox does not depend on it; consumers wire it in.
 *
 * ### Three outcomes
 *
 * `getToken(scope)` has three possible outcomes, and the choice between the
 * last two is the consumer's application-logic call — mailbox propagates
 * whichever the accessor returns faithfully.
 *
 * 1. **Return a `string`.** A valid token exists for this scope on this
 *    request. Mailbox calls the upstream provider with it.
 * 2. **Return `null`.** No token is available for this scope on this
 *    request, and that is a **normal, expected** state. Mailbox skips the
 *    upstream call entirely and propagates `null` through `getStats()` /
 *    the interceptor / the `@MailboxStats()` param decorator. Templates
 *    branch on `mailboxStats == null`. Use this when absence is part of
 *    the app's normal control flow — e.g. a SaaS where "connect your
 *    inbox" is optional and most users won't have done it.
 * 3. **Throw.** Something genuinely exceptional has happened — e.g. the
 *    accessor was reached without an authenticated request (invariant
 *    violation), or the accessor's own dependency (a token store) failed.
 *    Mailbox propagates the exception. Use this when *every* request to
 *    the calling route is expected to have a token, and its absence means
 *    the app is misconfigured or in a bad state — e.g. an internal tool
 *    where mailbox access is a hard prerequisite of the whole flow.
 *
 * The policy — "is absence normal or exceptional here?" — lives in the
 * accessor implementation. Mailbox itself has no opinion.
 *
 * @example
 * ```typescript
 * // SaaS: connecting Gmail is optional; absence is the common case.
 * import { getRequest } from "@neomaventures/request-context"
 *
 * @Injectable()
 * export class OptionalGmailTokenAccessor implements TokenAccessor {
 *   public constructor(
 *     private readonly oauthTokens: OAuthTokenService,
 *   ) {}
 *
 *   public async getToken(scope: string): Promise<string | null> {
 *     if (scope !== GMAIL_READONLY_SCOPE) {
 *       throw new Error(`Unsupported scope: ${scope}`)
 *     }
 *     const account = getRequest()?.account
 *     if (!account) {
 *       throw new Error("No authenticated account on the current request")
 *     }
 *     const token = await this.oauthTokens.findActiveToken(account.id, "google")
 *     if (!token || !token.scopes.includes(scope)) {
 *       return null // Normal absence — user hasn't connected Gmail yet.
 *     }
 *     return token.accessToken
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Internal tool: every user must have a live token; absence is a bug.
 * @Injectable()
 * export class RequiredGmailTokenAccessor implements TokenAccessor {
 *   public constructor(
 *     private readonly oauthTokens: OAuthTokenService,
 *   ) {}
 *
 *   public async getToken(scope: string): Promise<string | null> {
 *     const account = getRequest()?.account
 *     if (!account) throw new Error("No authenticated account")
 *     const token = await this.oauthTokens.getActiveToken(account.id, "google")
 *     // Throws if not present — the calling route can't function without it.
 *     return token.accessToken
 *   }
 * }
 * ```
 */
export interface TokenAccessor {
  /**
   * Resolve an access token — or signal absence — for the given scope.
   *
   * @param scope - The OAuth scope string the token must cover. For v0.1.0
   *   mailbox only requests {@link GMAIL_READONLY_SCOPE}.
   * @returns A valid access token string, or `null` if no token is
   *   available for this scope on this request and that is a normal
   *   (non-exceptional) state.
   * @throws If the accessor cannot answer the question — e.g. missing
   *   ambient request context, a token store failure, or a hard-required
   *   token being absent when the calling flow depends on it.
   */
  getToken(scope: string): Promise<string | null>
}
