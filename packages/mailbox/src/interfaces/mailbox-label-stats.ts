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
  /**
   * Identifier of the Gmail label these stats describe (e.g. `INBOX`,
   * `SENT`, or a custom label ID like `Label_42`). Stable identifier —
   * compare against `GmailSystemLabel` enum values rather than display
   * names. May widen to `string | MailboxLabel` (rich metadata) in a
   * future minor; consumers branching on the string today will need a
   * `typeof` narrow at that point.
   */
  label: string
  /** Total message count for the label */
  messageCount: number
  /** Unread message count for the label */
  unreadCount: number
}
