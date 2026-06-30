---
"@neomaventures/mailbox": minor
---

**BREAKING**: `@MailboxStats()` no longer throws `MailboxStatsUnavailableException` when `req.mailboxStats` is missing. It now throws a plain `Error` naming `MailboxStatsMiddleware`.

After the middleware-throws change (Gmail failures now surface as `MailboxApiException` / `MailboxNetworkException` directly from `MailboxStatsMiddleware`), the only way `req.mailboxStats` can be `undefined` at the decorator is if the consumer forgot to install the middleware on the route — a wiring bug, not a runtime user-facing condition. The decorator throws a plain `Error` (`"MailboxStats is not available — did you install MailboxStatsMiddleware on this route?"`) so the mistake surfaces at first request rather than leaking `undefined` into handler code.

Consumers who previously caught `MailboxStatsUnavailableException` should stop catching it — there is no user-recoverable condition behind it any more. Install `MailboxStatsMiddleware` on the route; the error will not recur. Real Gmail failures are now `MailboxApiException` / `MailboxNetworkException` and are best handled via `@neomaventures/exceptions`' `errorTemplates`.

The Express `Request.mailboxStats` type augmentation now ships from inside the package (declared alongside `MailboxStatsMiddleware`, the artifact that writes the slot) — consumers no longer need a hand-rolled `declare module "express"` block.
