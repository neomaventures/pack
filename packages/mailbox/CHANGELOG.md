# @neomaventures/mailbox

## 0.1.0

### Minor Changes

- 8104941: First release of `@neomaventures/mailbox` — a provider-agnostic mailbox sync primitive for NestJS apps. v0.1.0 is the proof-of-life surface: live Gmail inbox stats. Storage, sync cursors, events, and dedup land in subsequent minors.

  The v0.1.0 surface **intentionally omits entity wiring**. There are no sync writers in this slice — nothing inside the package reads or writes a per-mailbox row — so persisting "which Gmail address an account has connected" is treated as the host application's concern. A `Mailboxable` interface and a reference `MailAccount` entity will land in v0.2.0 alongside the first sync writer that needs them. Consumers shipping their own entity adapter today should treat it as application code, not a contract the package promises to honour.

  ## Module + service
  - `MailboxModule.forRoot(options)` and `MailboxModule.forRootAsync(options)` — extends `ConfigurableModuleClass`. Consumers pass a `tokenAccessor` class (a `TokenAccessor` implementation) and optional `gmailApiBaseUrl` (defaults to the production endpoint).
  - `MailboxService.getStats()` — resolves an access token via the configured `TokenAccessor`, calls Gmail's labels API for `INBOX`, returns `{ messageCount, unreadCount }`. Live query, no caching. Account-agnostic: the host's `TokenAccessor` resolves "for whom" internally via ambient request context.

  ## Ergonomic request-scoped surface
  - `MailboxStatsMiddleware` — silent resolver that fetches stats and stashes them on `req.mailboxStats`. Never throws; mount on the routes that need it.
  - `@MailboxStats()` param decorator — reads the resolved stats from the request and throws `MailboxStatsUnavailableException` when the slot is empty. Integrators write only the e2e; no controller-level try/catch.

  ## Contracts shipped for consumers to implement
  - `TokenAccessor` interface — single `getToken(scope)` method. Mailbox is account-agnostic; the host resolves the current principal via ambient context (canonically `@neomaventures/request-context`) and returns the access token for that scope.

  ## Exceptions (canonical downstream-client shape)
  - `GmailApiException` — thrown when Gmail returns a non-2xx. Upstream 401/404 surface verbatim; everything else collapses to `502 Bad Gateway`. Wire response is minimal and package-named — `{ statusCode, message: "Mailbox API returned <status>", error: "MailboxApi" }` — so the wire never discloses which upstream provider the package uses today. Debug fields (`endpoint`, `context`, `responseBody`, `cause`) live on the instance for server-side logs only.
  - `GmailNetworkException` — thrown when `fetch()` rejects (DNS, TCP, timeout, connection dropped). Returns `502 Bad Gateway` with the package-named wire shape `{ statusCode, message: "Mailbox network error", error: "MailboxNetwork" }`. Carries a `code` instance property extracted from the cause (`ECONNRESET` | `ETIMEDOUT` | `ENOTFOUND` | `EAI_AGAIN` | `UND_ERR_SOCKET` | `UNKNOWN`); the original cause is preserved via `Error.cause` for server logs.
  - `MailboxStatsUnavailableException` — thrown by `@MailboxStats()` when no middleware-resolved stats are present on the request. Returns `502 Bad Gateway` with wire shape `{ statusCode, message, error: "MailboxStatsUnavailable" }`.

  ## Constants
  - `GMAIL_READONLY_SCOPE` — the Gmail OAuth scope mailbox requires.
  - `GmailSystemLabel` enum — Gmail's well-known label IDs (`Inbox`, `Sent`, `Draft`, `Trash`, `Spam`, `Starred`, `Important`, `Unread`).
