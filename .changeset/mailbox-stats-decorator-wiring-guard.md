---
"@neomaventures/mailbox": minor
---

**BREAKING**: Stats wiring switches from middleware to the composition-decorator pattern. Apply `@WithMailboxStats()` to a route handler to opt in; the decorator composes `UseInterceptors(MailboxStatsInterceptor) + SetMetadata(...)`, matching the storage `@Upload` pattern. `@MailboxStats()` still reads `req.mailboxStats` and is unchanged at the call site.

Gained:
- `WithMailboxStats()` — method decorator that attaches the stats interceptor.
- `MailboxStatsInterceptor` — fetches Gmail stats before the handler runs and stashes them on `req.mailboxStats`. Throws `MailboxApiException` / `MailboxNetworkException` on upstream failure (same wire contract as before).

Removed:
- `MailboxStatsMiddleware` — deleted. Consumers no longer wire stats via `MiddlewareConsumer.apply(...).forRoutes(...)`; applying `@WithMailboxStats()` to the route is the entire opt-in.

Migration: drop the `configure(consumer)` middleware wiring and add `@WithMailboxStats()` to each route handler that uses `@MailboxStats()`. The `@MailboxStats()` wiring-error message now reads `"MailboxStats is not available — did you apply @WithMailboxStats() to this route?"`.

The Express `Request.mailboxStats` type augmentation now ships from inside the package (declared alongside `MailboxStatsInterceptor`, the artifact that writes the slot) — consumers do not need a hand-rolled `declare module "express"` block.

**BREAKING**: `GmailLabelStats` type renamed to `MailboxLabelStats`. Same shape (`{ messageCount, unreadCount }`); only the type name changes. Aligns with the package-named convention used for exception classes (`MailboxApiException`, `MailboxNetworkException`).
