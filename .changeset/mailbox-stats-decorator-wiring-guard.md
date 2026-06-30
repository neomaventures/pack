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

**BREAKING**: `MailboxLabelStats` (formerly `GmailLabelStats`) gains a new required field `label: string` identifying which Gmail label the stats describe. Type name stays `MailboxLabelStats` — the briefly-shipped `MailboxStats` rename caused a naming collision with the `@MailboxStats()` decorator that required an internal alias dance, so it was reverted. The field is designed to widen to `string | MailboxLabel` (rich metadata) in a future minor without forcing a consumer migration today; consumers branching on the string at that point will need a `typeof` narrow.

**BREAKING**: Public surface renamed for provider neutrality. `MailboxLabelStats` → `MailboxFolderStats`; `GmailSystemLabel` enum → `MailboxFolder`; `MailboxService.getStats(labelId)` → `getStats(folder)`; the field on the stats type renames from `label` to `folder`. Enum values are unchanged (still the underlying Gmail label IDs like `"INBOX"`); only the type/enum/param/field names become provider-neutral. `GMAIL_READONLY_SCOPE` stays Gmail-named — OAuth scopes are inherently provider-specific.
