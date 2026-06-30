import { HttpException, Inject, Injectable } from "@nestjs/common"

import { GMAIL_API_BASE_URL, GmailSystemLabel } from "../constants"
import { MailboxApiException } from "../exceptions/mailbox-api.exception"
import { MailboxNetworkException } from "../exceptions/mailbox-network.exception"
import { type MailboxStats } from "../interfaces/mailbox-stats"

const LABELS_ENDPOINT = "/gmail/v1/users/me/labels/{labelId}"

/**
 * Internal Gmail REST client.
 *
 * Wraps a tiny slice of the Gmail API — just what `MailboxService` needs
 * in v0.1.0. Not exported from the package barrel; consumers go through
 * `MailboxService`.
 *
 * Uses native `fetch` (Node 22+) so the package ships with zero HTTP
 * client dependencies.
 */
@Injectable()
export class GmailService {
  public constructor(
    @Inject(GMAIL_API_BASE_URL) private readonly baseUrl: string,
  ) {}

  /**
   * Fetches stats for a Gmail label.
   *
   * Hits `GET /gmail/v1/users/me/labels/{labelId}` with the given access
   * token. Maps Gmail's `messagesTotal` / `messagesUnread` to the mailbox
   * vocabulary (`messageCount` / `unreadCount`).
   *
   * @param token - A Gmail OAuth access token covering `gmail.readonly`
   * @param labelId - A {@link GmailSystemLabel} or a user-defined label
   *   ID (e.g. `Label_123`). Defaults to {@link GmailSystemLabel.Inbox}.
   * @returns The label's message + unread counts
   * @throws {MailboxApiException} When Gmail responds with a non-2xx status.
   *   Upstream `401` and `404` are surfaced verbatim; everything else
   *   collapses to `502 Bad Gateway`.
   * @throws {MailboxNetworkException} When the `fetch()` call rejects
   *   (dropped connection, DNS failure, etc.) — returns `502 Bad Gateway`.
   *
   * @example
   * ```typescript
   * const stats = await gmail.getStats(token)
   * // => { labelId: "INBOX", messageCount: 1234, unreadCount: 5 }
   * ```
   */
  public async getStats(
    token: string,
    labelId: GmailSystemLabel | string = GmailSystemLabel.Inbox,
  ): Promise<MailboxStats> {
    const url = `${this.baseUrl}/gmail/v1/users/me/labels/${encodeURIComponent(labelId)}`
    let response: Response
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (error) {
      throw new MailboxNetworkException(
        LABELS_ENDPOINT,
        { labelId },
        error as Error,
      )
    }

    if (!response.ok) {
      const responseBody = await response.text().catch(() => "")
      throw new MailboxApiException(
        LABELS_ENDPOINT,
        { labelId },
        new HttpException(
          { statusCode: response.status, body: responseBody },
          response.status,
        ),
      )
    }

    const body = (await response.json()) as {
      messagesTotal?: number
      messagesUnread?: number
    }

    return {
      labelId,
      messageCount: body.messagesTotal ?? 0,
      unreadCount: body.messagesUnread ?? 0,
    }
  }
}
