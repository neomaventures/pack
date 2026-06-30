/**
 * Stats for a single mailbox label.
 *
 * Provider-neutral shape used across the mailbox package. The Gmail
 * REST client at `GmailService.getStats` translates Gmail's
 * `messagesTotal` / `messagesUnread` into this vocabulary; future
 * provider adapters (IMAP, Microsoft Graph, etc.) translate their own
 * native shapes into the same fields.
 */
export type MailboxStats = {
  /**
   * The Gmail label ID these stats are for (e.g. `INBOX`, `SENT`, or a
   * custom user label like `Label_42`). Stable identifier — consumers
   * should compare against `GmailSystemLabel` enum values rather than
   * display names.
   */
  labelId: string
  /** Total message count for the label */
  messageCount: number
  /** Unread message count for the label */
  unreadCount: number
}
