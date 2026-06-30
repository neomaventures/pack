/**
 * Stats for a single mailbox label.
 *
 * Provider-neutral shape used across the mailbox package. The Gmail
 * REST client at `GmailService.getStats` translates Gmail's
 * `messagesTotal` / `messagesUnread` into this vocabulary; future
 * provider adapters (IMAP, Microsoft Graph, etc.) translate their own
 * native shapes into the same fields.
 */
export type MailboxLabelStats = {
  /** Total message count for the label */
  messageCount: number
  /** Unread message count for the label */
  unreadCount: number
}
