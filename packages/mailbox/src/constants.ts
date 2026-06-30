/**
 * Gmail OAuth scope for read-only access to the user's mailbox. Mailbox
 * requests this scope for every stats query in v0.1.0; future slices may
 * add `gmail.modify`, `gmail.send`, etc. as new operations land.
 *
 * Exported as a constant (not a string literal at call sites) so host
 * adapters can pattern-match by reference rather than string equality.
 */
export const GMAIL_READONLY_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly" as const

/**
 * Well-known mailbox folders. Values map to the underlying provider's
 * identifiers — currently Gmail label IDs, which are stable across all
 * Gmail accounts and documented at
 * https://developers.google.com/gmail/api/guides/labels.
 *
 * Exported as a string enum so consumers can refer to folders by name
 * (`MailboxFolder.Inbox`) while the underlying string value stays the
 * literal the wire expects today (`"INBOX"`).
 */
export enum MailboxFolder {
  Inbox = "INBOX",
  Sent = "SENT",
  Draft = "DRAFT",
  Trash = "TRASH",
  Spam = "SPAM",
  Starred = "STARRED",
  Important = "IMPORTANT",
  Unread = "UNREAD",
}
