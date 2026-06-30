# @neomaventures/mailbox

## 0.3.0

### Minor Changes

- 551842f: Renamed `GmailApiException` → `MailboxApiException`, `GmailNetworkException` → `MailboxNetworkException` per the pack-wide naming convention (#287). Consumers configuring `errorTemplates` must update their keys: `GmailApiException` → `MailboxApiException`, `GmailNetworkException` → `MailboxNetworkException`. No behavioural change; constructor signatures, instance properties, wire response (`error: "MailboxApi"` / `"MailboxNetwork"`), and HTTP status mappings are identical.
- 6eaeb37: **BREAKING**: Stats wiring switches from middleware to the composition-decorator pattern. Apply `@WithMailboxStats()` to a route handler to opt in; the decorator composes `UseInterceptors(MailboxStatsInterceptor) + SetMetadata(...)`, matching the storage `@Upload` pattern. `@MailboxStats()` still reads `req.mailboxStats` and is unchanged at the call site.

  Gained:
  - `WithMailboxStats()` — method decorator that attaches the stats interceptor.
  - `MailboxStatsInterceptor` — fetches Gmail stats before the handler runs and stashes them on `req.mailboxStats`. Throws `MailboxApiException` / `MailboxNetworkException` on upstream failure (same wire contract as before).

  Removed:
  - `MailboxStatsMiddleware` — deleted. Consumers no longer wire stats via `MiddlewareConsumer.apply(...).forRoutes(...)`; applying `@WithMailboxStats()` to the route is the entire opt-in.

  Migration: drop the `configure(consumer)` middleware wiring and add `@WithMailboxStats()` to each route handler that uses `@MailboxStats()`. The `@MailboxStats()` wiring-error message now reads `"MailboxStats is not available — did you apply @WithMailboxStats() to this route?"`.

  The Express `Request.mailboxStats` type augmentation now ships from inside the package (declared alongside `MailboxStatsInterceptor`, the artifact that writes the slot) — consumers do not need a hand-rolled `declare module "express"` block.

  **BREAKING**: `MailboxLabelStats` (formerly `GmailLabelStats`) gains a new required field `label: string` identifying which Gmail label the stats describe. Type name stays `MailboxLabelStats` — the briefly-shipped `MailboxStats` rename caused a naming collision with the `@MailboxStats()` decorator that required an internal alias dance, so it was reverted. The field is designed to widen to `string | MailboxLabel` (rich metadata) in a future minor without forcing a consumer migration today; consumers branching on the string at that point will need a `typeof` narrow.

  **BREAKING**: Public surface renamed for provider neutrality. `MailboxLabelStats` → `MailboxFolderStats`; `GmailSystemLabel` enum → `MailboxFolder`; `MailboxService.getStats(labelId)` → `getStats(folder)`; the field on the stats type renames from `label` to `folder`. Enum values are unchanged (still the underlying Gmail label IDs like `"INBOX"`); only the type/enum/param/field names become provider-neutral. `GMAIL_READONLY_SCOPE` stays Gmail-named — OAuth scopes are inherently provider-specific.

- 9e17066: **BREAKING**: Renamed `MailboxApiException` constructor signature from `(statusCode, endpoint, message, context, responseBody, cause?)` to `(endpoint, context, cause: HttpException)` to match the symmetric shape now used by `@neomaventures/auth`'s `AuthApiException`. The cause's `getStatus()` provides the upstream status. Consumers constructing this exception directly must migrate.

  **BREAKING**: `MailboxApiException` now always returns HTTP 502 regardless of upstream Gmail status. Previously 401/404 passed through verbatim. Consumers branching on the wire status receive 502 uniformly for upstream Gmail failures; branch on `err.cause.getStatus()` from a filter / log handler if upstream-status access is needed. Symmetric with `MailboxNetworkException` (already flat-502) and aligned with `AuthApiException` post-#294.

  **BREAKING**: `MailboxApiException`'s wire `message` is now `"Bad Gateway"` (the NestJS idiom for a 502, matching `AuthApiException`) instead of `"Mailbox API returned <upstreamStatus>"`. The upstream status was the second channel by which upstream details reached the client — the wire response no longer discloses it. Upstream status and message remain accessible via `err.cause.getStatus()` / `err.cause.message` for server logs. Consumers rendering or asserting on the message string will see the new value.

  **BREAKING**: `MailboxNetworkException`'s wire `message` is now `"Bad Gateway"` (matching `MailboxApiException` and `AuthNetworkException`) instead of `"Mailbox network error"`. Both API and Network exceptions now produce identical opaque wire shapes apart from the `error` discriminator (`"MailboxApi"` vs `"MailboxNetwork"`).

  **BREAKING**: Dropped the `code` instance property from `MailboxNetworkException`. The field duplicated information already available on the cause chain and required an `AbortError → ETIMEDOUT` inference that wasn't always correct. Consumers and log handlers that need the underlying OS errno should read it from `err.cause.cause?.code` (undici-wrapped) or `err.cause.code` (older shape) — matching the auth-network pattern.

## 0.2.0

### Minor Changes

- c991fa1: Drop the v0.1.0 silent-resolver workaround. `MailboxStatsMiddleware`
  now throws `GmailApiException` / `GmailNetworkException` directly
  instead of swallowing errors and deferring to a decorator-side throw.
  `MailboxStatsUnavailableException` is removed; the `@MailboxStats()`
  decorator collapses to a pure value reader.

  Consumers must configure `ExceptionHandlerModule.forRoot({
errorTemplates: { GmailApiException, GmailNetworkException, default } })`
  to render an error UI when Gmail is unreachable — the previous
  per-route `@ErrorTemplate({ MailboxStatsUnavailableException: ... })`
  pattern is no longer needed. See the README for the new wiring.

  `GmailApiException` and `GmailNetworkException` now set `this.name`
  to their class name so `errorTemplates` can key on them.

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
