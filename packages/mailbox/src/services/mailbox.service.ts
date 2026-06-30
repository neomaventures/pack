import { Inject, Injectable } from "@nestjs/common"

import { GMAIL_READONLY_SCOPE, GmailSystemLabel } from "../constants"
import { type MailboxLabelStats } from "../interfaces/mailbox-label-stats"
import { type TokenAccessor } from "../interfaces/token-accessor.interface"
import { TOKEN_ACCESSOR } from "../mailbox.options"

import { GmailService } from "./gmail.service"

/**
 * Public mailbox surface.
 *
 * Resolves an OAuth access token via the consumer-supplied
 * {@link TokenAccessor} class, then delegates to {@link GmailService} for
 * the live Gmail label fetch. No caching — every call hits the Gmail API.
 *
 * Mailbox is account-agnostic: `getStats()` takes no principal. The
 * consumer's `TokenAccessor` resolves "for whom" internally via ambient
 * request context (the canonical mechanism is
 * `@neomaventures/request-context`).
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
 *   public async stats() {
 *     return this.mailbox.getStats()
 *   }
 * }
 * ```
 */
@Injectable()
export class MailboxService {
  public constructor(
    @Inject(TOKEN_ACCESSOR)
    private readonly tokenAccessor: TokenAccessor,
    private readonly gmailService: GmailService,
  ) {}

  /**
   * Fetches Gmail stats for the mailbox connected to the current request.
   *
   * Requests a token via {@link TokenAccessor.getToken} with the
   * `gmail.readonly` scope, then calls {@link GmailService.getStats} for
   * the configured label (defaults to {@link GmailSystemLabel.Inbox}).
   *
   * @returns Message + unread counts for the inbox.
   *
   * @throws {MailboxApiException} Surfaced from `GmailService` when Gmail
   *   responds with a non-2xx status.
   * @throws {MailboxNetworkException} Surfaced from `GmailService` when the
   *   `fetch()` call rejects.
   *
   * @example
   * ```typescript
   * const stats = await mailbox.getStats()
   * // => { label: "INBOX", messageCount: 1234, unreadCount: 5 }
   * ```
   */
  public async getStats(): Promise<MailboxLabelStats> {
    const token = await this.tokenAccessor.getToken(GMAIL_READONLY_SCOPE)
    return this.gmailService.getStats(token, GmailSystemLabel.Inbox)
  }
}
