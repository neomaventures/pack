---
"@neomaventures/mailbox": minor
---

**BREAKING**: Renamed `MailboxApiException` constructor signature from `(statusCode, endpoint, message, context, responseBody, cause?)` to `(endpoint, context, cause: HttpException)` to match the symmetric shape now used by `@neomaventures/auth`'s `AuthApiException`. The cause's `getStatus()` provides the upstream status; mapping rule (401/404 passthrough else 502) unchanged. Wire response (`{ statusCode, message, error: "MailboxApi" }`) is byte-identical. Consumers constructing this exception directly must migrate; the wire contract is preserved.
