---
"@neomaventures/mailbox": minor
---

`MailboxStatsInterceptor` now mirrors the resolved stats to `res.locals.mailboxStats` in addition to `req.mailboxStats`. View templates can read `<%= mailboxStats.messageCount %>` directly without a controller-level view-model shim, matching the `res.locals.account` convention. The `@MailboxStats()` param decorator continues to read from `req.mailboxStats` unchanged.
