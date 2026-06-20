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
