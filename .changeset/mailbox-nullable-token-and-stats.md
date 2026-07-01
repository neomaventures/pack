---
"@neomaventures/mailbox": minor
---

`TokenAccessor.getToken` gains a nullable return type — the three-outcome contract is now explicit: return a `string` (mailbox uses it), return `null` ("no token available on this request", a normal non-exceptional state — mailbox skips the upstream call), or throw (a genuine failure — mailbox propagates). The choice between returning `null` and throwing is the consumer's application-logic call; mailbox propagates either faithfully.

`MailboxService.getStats()` now returns `Promise<MailboxFolderStats | null>`. `MailboxStatsInterceptor` mirrors `null` to both `req.mailboxStats` and `res.locals.mailboxStats`. The `@MailboxStats()` param decorator resolves to `MailboxFolderStats | null`; the "wiring missing" and "interceptor didn't run" invariant throws are unchanged. Consumers implementing the accessor should now branch on `null` at the handler/template level when absence is a normal state (e.g. a SaaS where connecting Gmail is optional).
