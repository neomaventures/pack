---
"@neomaventures/mailbox": minor
---

**BREAKING**: Renamed `MailboxApiException` constructor signature from `(statusCode, endpoint, message, context, responseBody, cause?)` to `(endpoint, context, cause: HttpException)` to match the symmetric shape now used by `@neomaventures/auth`'s `AuthApiException`. The cause's `getStatus()` provides the upstream status. Consumers constructing this exception directly must migrate.

**BREAKING**: `MailboxApiException` now always returns HTTP 502 regardless of upstream Gmail status. Previously 401/404 passed through verbatim. Consumers branching on the wire status receive 502 uniformly for upstream Gmail failures; branch on `err.cause.getStatus()` from a filter / log handler if upstream-status access is needed. Symmetric with `MailboxNetworkException` (already flat-502) and aligned with `AuthApiException` post-#294.

**BREAKING**: `MailboxApiException`'s wire `message` is now `"Bad Gateway"` (the NestJS idiom for a 502, matching `AuthApiException`) instead of `"Mailbox API returned <upstreamStatus>"`. The upstream status was the second channel by which upstream details reached the client — the wire response no longer discloses it. Upstream status and message remain accessible via `err.cause.getStatus()` / `err.cause.message` for server logs. Consumers rendering or asserting on the message string will see the new value.

**BREAKING**: `MailboxNetworkException`'s wire `message` is now `"Bad Gateway"` (matching `MailboxApiException` and `AuthNetworkException`) instead of `"Mailbox network error"`. Both API and Network exceptions now produce identical opaque wire shapes apart from the `error` discriminator (`"MailboxApi"` vs `"MailboxNetwork"`).

**BREAKING**: Dropped the `code` instance property from `MailboxNetworkException`. The field duplicated information already available on the cause chain and required an `AbortError → ETIMEDOUT` inference that wasn't always correct. Consumers and log handlers that need the underlying OS errno should read it from `err.cause.cause?.code` (undici-wrapped) or `err.cause.code` (older shape) — matching the auth-network pattern.
