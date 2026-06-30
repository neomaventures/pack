---
"@neomaventures/mailbox": minor
---

**BREAKING**: Renamed `MailboxApiException` constructor signature from `(statusCode, endpoint, message, context, responseBody, cause?)` to `(endpoint, context, cause: HttpException)` to match the symmetric shape now used by `@neomaventures/auth`'s `AuthApiException`. The cause's `getStatus()` provides the upstream status. Consumers constructing this exception directly must migrate.

**BREAKING**: `MailboxApiException` now always returns HTTP 502 regardless of upstream Gmail status. Previously 401/404 passed through verbatim. Consumers branching on the wire status receive 502 uniformly for upstream Gmail failures; branch on `err.cause.getStatus()` from a filter / log handler if upstream-status access is needed. Symmetric with `MailboxNetworkException` (already flat-502) and aligned with `AuthApiException` post-#294.
