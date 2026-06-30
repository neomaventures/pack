/**
 * DI token for the Gmail API base URL. Defaults to
 * `https://gmail.googleapis.com` in production; tests override this with a
 * MockServer URL so requests stay off the real Gmail API.
 *
 * Internal — not re-exported from the public barrel. `GmailService` reads
 * it via `@Inject(GMAIL_API_BASE_URL)`.
 */
export const GMAIL_API_BASE_URL = Symbol("GMAIL_API_BASE_URL")

/**
 * Production default for `GMAIL_API_BASE_URL`. Kept as a named constant so
 * `MailboxModule` can wire it as the provider value without repeating the
 * literal.
 */
export const GMAIL_API_BASE_URL_DEFAULT = "https://gmail.googleapis.com"
