import { Inject, Injectable } from "@nestjs/common"

import { GMAIL_READONLY_SCOPE, GmailSystemLabel } from "../constants"
import { type Mailboxable } from "../interfaces/mailboxable.interface"
import { type TokenAccessor } from "../interfaces/token-accessor.interface"
import { TOKEN_ACCESSOR } from "../mailbox.options"

import { type GmailLabelStats, GmailService } from "./gmail.service"

/**
 * Public mailbox surface.
 *
 * Resolves an OAuth access token via the consumer-supplied
 * {@link TokenAccessor} class, then delegates to {@link GmailService} for
 * the live Gmail label fetch. No caching — every call hits the Gmail API.
 *
 * Generic over the consumer's `Mailboxable` entity so method signatures
 * narrow at the injection site. Defaults to the reference `MailAccount`.
 *
 * @example
 * ```typescript
 * @Controller("profile")
 * export class ProfileController {
 *   public constructor(
 *     private readonly mailbox: MailboxService,
 *   ) {}
 *
 *   @Get()
 *   public async stats(@CurrentAccount() account: Account) {
 *     return this.mailbox.getStats(account)
 *   }
 * }
 * ```
 */
@Injectable()
export class MailboxService<T extends Mailboxable = Mailboxable> {
  public constructor(
    @Inject(TOKEN_ACCESSOR)
    private readonly tokenAccessor: TokenAccessor,
    private readonly gmailService: GmailService,
  ) {}

  /**
   * Fetches Gmail stats for the given account's mailbox.
   *
   * Requests a token via {@link TokenAccessor.getToken} with the
   * `gmail.readonly` scope, then calls
   * {@link GmailService.getStats} for the configured label (defaults to
   * {@link GmailSystemLabel.Inbox}).
   *
   * @param account - The host's principal; passed verbatim to the
   *   consumer's `TokenAccessor`, which decides how to look up the right
   *   token for that account.
   * @returns Message + unread counts for the account's inbox.
   *
   * @throws {GmailApiException} Surfaced from `GmailService` when Gmail
   *   responds with a non-2xx status.
   * @throws {GmailNetworkException} Surfaced from `GmailService` when the
   *   `fetch()` call rejects.
   *
   * @example
   * ```typescript
   * const stats = await mailbox.getStats(account)
   * // => { messageCount: 1234, unreadCount: 5 }
   * ```
   */
  public async getStats(account: T): Promise<GmailLabelStats> {
    const token = await this.tokenAccessor.getToken(account, [
      GMAIL_READONLY_SCOPE,
    ])
    return this.gmailService.getStats(token, GmailSystemLabel.Inbox)
  }
}
