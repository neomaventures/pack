---
"@neomaventures/mailbox": minor
---

Renamed `GmailApiException` → `MailboxApiException`, `GmailNetworkException` → `MailboxNetworkException` per the pack-wide naming convention (#287). Consumers configuring `errorTemplates` must update their keys: `GmailApiException` → `MailboxApiException`, `GmailNetworkException` → `MailboxNetworkException`. No behavioural change; constructor signatures, instance properties, wire response (`error: "MailboxApi"` / `"MailboxNetwork"`), and HTTP status mappings are identical.
