import { Inject, Injectable } from "@nestjs/common"

import { GMAIL_API_BASE_URL } from "../constants"
import { GmailApiException } from "../exceptions/gmail-api.exception"

/**
 * Stats for a single Gmail label, as returned by `GmailService.getStats`.
 *
 * Vocabulary is intentionally renamed from Gmail's `messagesTotal` /
 * `messagesUnread` to `messageCount` / `unreadCount` — mailbox uses the
 * latter as its public stats shape, and `GmailService` is the boundary
 * where that translation happens.
 */
export type GmailLabelStats = {
  /** Total message count for the label */
  messageCount: number
  /** Unread message count for the label */
  unreadCount: number
}

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
   * @param labelId - The Gmail label ID (e.g. `INBOX`, `SENT`, or
   *   a user-defined `Label_123`). Defaults to `"INBOX"`.
   * @returns The label's message + unread counts
   * @throws {GmailApiException} When Gmail responds with a non-2xx status.
   *   Upstream `401` and `404` are surfaced verbatim; everything else
   *   collapses to `502 Bad Gateway`.
   *
   * @example
   * ```typescript
   * const stats = await gmail.getStats(token)
   * // => { messageCount: 1234, unreadCount: 5 }
   * ```
   */
  public async getStats(
    token: string,
    labelId: string = "INBOX",
  ): Promise<GmailLabelStats> {
    const url = `${this.baseUrl}/gmail/v1/users/me/labels/${encodeURIComponent(labelId)}`
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new GmailApiException(response.status, labelId, response.statusText)
    }

    const body = (await response.json()) as {
      messagesTotal?: number
      messagesUnread?: number
    }

    return {
      messageCount: body.messagesTotal ?? 0,
      unreadCount: body.messagesUnread ?? 0,
    }
  }
}
