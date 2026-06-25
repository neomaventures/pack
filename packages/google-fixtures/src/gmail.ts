import { faker } from "@faker-js/faker"

const { number } = faker

/**
 * Shape of a Gmail Labels API response for
 * `GET /gmail/v1/users/me/labels/{id}`.
 *
 * @see https://developers.google.com/gmail/api/reference/rest/v1/users.labels#Label
 */
export type GmailLabel = {
  /** The label ID (e.g. `INBOX`, `SENT`, or a user-defined `Label_123`) */
  id: string
  /** The display name of the label */
  name: string
  /** Whether the label is system-defined or user-defined */
  type: "system" | "user"
  /** Total number of messages with the label */
  messagesTotal: number
  /** Number of unread messages with the label */
  messagesUnread: number
  /** Total number of threads with the label */
  threadsTotal: number
  /** Number of unread threads with the label */
  threadsUnread: number
}

/**
 * Fake data generators for Gmail API responses.
 *
 * Each method returns a realistic-looking object using `@faker-js/faker`.
 * Use these in both unit and e2e tests — no MockServer dependency required.
 *
 * @example
 * ```typescript
 * import { gmail } from "@neomaventures/google-fixtures"
 *
 * const inbox = gmail.label({ id: "INBOX", messagesUnread: 5 })
 * ```
 */
export const gmail = {
  /**
   * Returns a fake Gmail Labels API response object.
   *
   * Defaults model the `INBOX` system label with faker-backed counts.
   * Override any field by passing it explicitly; `threadsTotal` and
   * `threadsUnread` default to `messagesTotal`/`messagesUnread` for
   * the v0.1.0 vocabulary (mailbox does not distinguish threads from
   * messages at the stats level).
   *
   * @param overrides - Optional partial overrides for the label fields
   * @returns A complete {@link GmailLabel} object
   *
   * @example
   * ```typescript
   * gmail.label()                              // INBOX with random counts
   * gmail.label({ id: "SENT", name: "SENT" })  // SENT label
   * gmail.label({ messagesUnread: 42 })        // INBOX, 42 unread
   * ```
   */
  label({
    id = "INBOX",
    name = "INBOX",
    type = "system",
    messagesTotal = number.int({ min: 100, max: 5000 }),
    messagesUnread = number.int({ min: 0, max: 200 }),
    threadsTotal,
    threadsUnread,
  }: Partial<GmailLabel> = {}): GmailLabel {
    return {
      id,
      name,
      type,
      messagesTotal,
      messagesUnread,
      threadsTotal: threadsTotal ?? messagesTotal,
      threadsUnread: threadsUnread ?? messagesUnread,
    }
  },
}
