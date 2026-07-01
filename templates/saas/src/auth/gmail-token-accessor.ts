import {
  type Account,
  getAccount,
  OAuthTokenService,
} from "@neomaventures/auth"
import {
  GMAIL_READONLY_SCOPE,
  type TokenAccessor,
} from "@neomaventures/mailbox"
import { Injectable } from "@nestjs/common"

/**
 * SaaS-template {@link TokenAccessor} that resolves a Gmail-scoped OAuth
 * access token for the current request's authenticated account.
 *
 * Mailbox is account-agnostic: it asks the host for a token covering a
 * given scope and lets the host decide whose token to return. This accessor
 * reads the authenticated `Account` from the `@neomaventures/auth`
 * request-scoped account slot, looks up the active `google` `OAuthToken`,
 * and returns its access token when the `gmail.readonly` scope is present.
 *
 * Per the {@link TokenAccessor} three-outcome contract, this SaaS template
 * treats "user hasn't connected Gmail" as a **normal** application state —
 * connecting your inbox is optional, and most users won't have done it.
 * The accessor returns `null` for that path; mailbox propagates `null`
 * through `getStats()` and the profile page renders the "Unavailable"
 * cells. No exception, no error UI.
 *
 * - **Unsupported scope** — throws a plain `Error`. v0.1.0 mailbox only
 *   requests `GMAIL_READONLY_SCOPE`; surface anything else loudly so the
 *   wiring bug is obvious.
 * - **No account on the current request** — throws a plain `Error`. The
 *   auth middleware should have populated the account slot; missing it
 *   indicates a wiring bug, not a user-facing state.
 * - **No google token / expired token / token missing the scope** —
 *   returns `null`. The profile page branches on `mailboxStats == null`.
 *
 * @example
 * ```typescript
 * MailboxModule.forRootAsync({
 *   tokenAccessor: GmailTokenAccessor,
 *   useFactory: (config) => ({ gmailApiBaseUrl: config.gmailApiBaseUrl }),
 *   inject: [ConfigService],
 * })
 * ```
 */
@Injectable()
export class GmailTokenAccessor implements TokenAccessor {
  /**
   * Resolve an access token covering the given scope, or `null` when the
   * account has no active Gmail-scoped OAuth token on this request.
   *
   * @param scope - The OAuth scope string the token must cover. Mailbox
   *   v0.1.0 always passes `GMAIL_READONLY_SCOPE`.
   * @returns The access token string when the account has an active google
   *   token covering `gmail.readonly`, or `null` when it does not.
   * @throws {Error} When `scope` is not `GMAIL_READONLY_SCOPE`, or when no
   *   authenticated account is on the current request.
   */
  public async getToken(scope: string): Promise<string | null> {
    if (scope !== GMAIL_READONLY_SCOPE) {
      throw new Error(`Unsupported scope: ${scope}`)
    }

    const account = getAccount<Account>()
    if (!account) {
      throw new Error("No authenticated account on the current request")
    }

    const token = OAuthTokenService.getActiveToken(account, "google")
    if (!token?.scopes.includes(GMAIL_READONLY_SCOPE)) {
      return null
    }

    return token.accessToken
  }
}
