import { Inject, Injectable } from "@nestjs/common"

import { GMAIL_API_BASE_URL } from "../constants"

/**
 * Stats for a single Gmail label, as returned by `GmailService.getLabelStats`.
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
   *   a user-defined `Label_123`)
   * @returns The label's message + unread counts
   * @throws Error when Gmail responds with a non-200 status. The error
   *   message includes the HTTP status and label ID for easy diagnosis.
   *
   * @example
   * ```typescript
   * const stats = await gmail.getLabelStats(token, "INBOX")
   * // => { messageCount: 1234, unreadCount: 5 }
   * ```
   */
  public async getLabelStats(
    token: string,
    labelId: string,
  ): Promise<GmailLabelStats> {
    const url = `${this.baseUrl}/gmail/v1/users/me/labels/${encodeURIComponent(labelId)}`
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(
        `Gmail API error fetching label "${labelId}": HTTP ${response.status} ${response.statusText}`,
      )
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
