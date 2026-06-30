import { Inject, Injectable } from "@nestjs/common"

import { GMAIL_READONLY_SCOPE, MailboxFolder } from "../constants"
import { type MailboxFolderStats } from "../interfaces/mailbox-folder-stats"
import { type TokenAccessor } from "../interfaces/token-accessor.interface"
import { TOKEN_ACCESSOR } from "../mailbox.options"

import { GmailService } from "./gmail.service"

/**
 * Public mailbox surface.
 *
 * Resolves an OAuth access token via the consumer-supplied
 * {@link TokenAccessor} class, then delegates to {@link GmailService} for
 * the live folder-stats fetch. No caching — every call hits the upstream
 * provider.
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
   * Fetch stats for a folder. Defaults to {@link MailboxFolder.Inbox}.
   *
   * Requests a token via {@link TokenAccessor.getToken} with the
   * `gmail.readonly` scope, then calls {@link GmailService.getStats} for
   * the requested folder. The folder identifier is currently treated as a
   * Gmail label ID under the hood.
   *
   * @param folder - The folder to fetch stats for. Defaults to
   *   {@link MailboxFolder.Inbox}.
   * @returns Message + unread counts for the folder.
   *
   * @throws {MailboxApiException} Surfaced from `GmailService` when Gmail
   *   responds with a non-2xx status.
   * @throws {MailboxNetworkException} Surfaced from `GmailService` when the
   *   `fetch()` call rejects.
   *
   * @example
   * ```typescript
   * const stats = await mailbox.getStats()
   * // => { folder: "INBOX", messageCount: 1234, unreadCount: 5 }
   * ```
   */
  public async getStats(
    folder: MailboxFolder | string = MailboxFolder.Inbox,
  ): Promise<MailboxFolderStats> {
    const token = await this.tokenAccessor.getToken(GMAIL_READONLY_SCOPE)
    return this.gmailService.getStats(token, folder)
  }
}
