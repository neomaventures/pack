---
"@neomaventures/mailbox": minor
---

Drop the v0.1.0 silent-resolver workaround. `MailboxStatsMiddleware`
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
