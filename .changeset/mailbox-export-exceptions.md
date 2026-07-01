---
"@neomaventures/mailbox": minor
---

Export `MailboxApiException` and `MailboxNetworkException` from the main barrel.

Consumers wiring mailbox into their own routes need to catch these classes inline when rendering error state — they were previously reachable only via deep imports. Now available from `@neomaventures/mailbox` alongside `MailboxService` and the decorators.
