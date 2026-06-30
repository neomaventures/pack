---
"@neomaventures/mailbox": minor
---

**BREAKING**: `@MailboxStats()` param decorator removed. Controllers read `req.mailboxStats` directly (typed via module augmentation in the consumer app — `declare module "express" { interface Request { mailboxStats?: GmailLabelStats } }`).

The decorator existed under the old "middleware never throws → decorator enforces" rule. With `@neomaventures/exceptions` global error templates (#281), `MailboxStatsMiddleware` now throws `MailboxApiException` / `MailboxNetworkException` directly when its contract ("fetch stats") is violated, and the global filter renders the response. The decorator no longer earns its keep — a direct `req.mailboxStats` read is simpler and one fewer symbol to learn.
