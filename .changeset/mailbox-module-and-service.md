---
"@neomaventures/mailbox": minor
---

Add `MailboxModule` (`forRoot` / `forRootAsync` via `ConfigurableModuleBuilder`) and `MailboxService.getStats(account)`. Consumers configure mailbox with a `tokenAccessor` class implementing `TokenAccessor`; `MailboxService` resolves an access token via that accessor and returns live Gmail inbox stats — `{ messageCount, unreadCount }`. Optional `entity` and `gmailApiBaseUrl` options default to the reference `MailAccount` entity and the production Gmail endpoint.
