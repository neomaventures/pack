---
"@neomaventures/mailbox": minor
---

First release of `@neomaventures/mailbox` — a provider-agnostic mailbox sync primitive for NestJS apps. v0.1.0 is the proof-of-life surface: live Gmail inbox stats. Storage, sync cursors, events, and dedup land in subsequent minors.

## Module + service

- `MailboxModule.forRoot(options)` and `MailboxModule.forRootAsync(options)` — extends `ConfigurableModuleClass`. Consumers pass a `tokenAccessor` class (a `TokenAccessor` implementation), optional `entity` (defaults to the reference `MailAccount`), and optional `gmailApiBaseUrl` (defaults to the production endpoint).
- `MailboxService.getStats()` — resolves an access token via the configured `TokenAccessor`, calls Gmail's labels API for `INBOX`, returns `{ messageCount, unreadCount }`. Live query, no caching. Account-agnostic: the host's `TokenAccessor` resolves "for whom" internally via ambient request context.

## Ergonomic request-scoped surface

- `MailboxStatsMiddleware` — silent resolver that fetches stats and stashes them on `req.mailboxStats`. Never throws; mount on the routes that need it.
- `@MailboxStats()` param decorator — reads the resolved stats from the request and throws `MailboxStatsUnavailableException` when the slot is empty. Integrators write only the e2e; no controller-level try/catch.

## Contracts shipped for consumers to implement / extend

- `TokenAccessor` interface — single `getToken(scope)` method. Mailbox is account-agnostic; the host resolves the current principal via ambient context (canonically `@neomaventures/request-context`) and returns the access token for that scope.
- `Mailboxable` interface — minimum shape for a mailbox-owning entity (`id`, `accountId`, `gmailAddress`). Consumers implement on their own entity class via the `MailboxOptions.entity` override.

## Reference entity (subpath `./entities`)

- `MailAccount` — slim reference implementation of `Mailboxable` (`id` uuid, `accountId`, `gmailAddress`). Consumers register directly via `TypeOrmModule.forFeature([MailAccount])` or implement `Mailboxable` on their own entity. Exported from both `@neomaventures/mailbox` and `@neomaventures/mailbox/entities`.

## Exceptions (canonical downstream-client shape)

- `GmailApiException` — thrown when Gmail returns a non-2xx. Upstream 401/404 surface verbatim; everything else collapses to `502 Bad Gateway`. Wire response stays minimal (`{ statusCode, message, error: "GmailApi" }`); debug fields (`endpoint`, `context`, `responseBody`, `cause`) on the instance for server-side logs.
- `GmailNetworkException` — thrown when `fetch()` rejects (DNS, TCP, timeout, connection dropped). Returns `502 Bad Gateway`. Carries a `code` instance property extracted from the cause (`ECONNRESET` | `ETIMEDOUT` | `ENOTFOUND` | `EAI_AGAIN` | `UND_ERR_SOCKET` | `UNKNOWN`).
- `MailboxStatsUnavailableException` — thrown by `@MailboxStats()` when no middleware-resolved stats are present on the request. Returns `502 Bad Gateway` with wire shape `{ statusCode, message, error: "MailboxStatsUnavailable" }`.

## Constants

- `GMAIL_READONLY_SCOPE` — the Gmail OAuth scope mailbox requires.
- `GmailSystemLabel` enum — Gmail's well-known label IDs (`Inbox`, `Sent`, `Draft`, `Trash`, `Spam`, `Starred`, `Important`, `Unread`).
