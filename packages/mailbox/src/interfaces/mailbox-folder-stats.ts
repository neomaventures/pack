/**
 * Stats for a single mailbox folder.
 *
 * Provider-neutral shape used across the mailbox package. The Gmail
 * REST client at `GmailService.getStats` translates Gmail's
 * `messagesTotal` / `messagesUnread` into this vocabulary; future
 * provider adapters (IMAP, Microsoft Graph, etc.) translate their own
 * native shapes into the same fields.
 */
export type MailboxFolderStats = {
  /**
   * Identifier of the folder these stats describe. Currently Gmail label
   * IDs (e.g. `INBOX`, `SENT`, or a custom label like `Label_42`). Stable
   * identifier — compare against `MailboxFolder` enum values rather than
   * display names. May widen to `string | MailboxFolderRef` (rich
   * metadata) in a future minor; consumers branching on the string today
   * will need a `typeof` narrow at that point.
   */
  folder: string
  /** Total message count for the folder */
  messageCount: number
  /** Unread message count for the folder */
  unreadCount: number
}
