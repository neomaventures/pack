---
"@neomaventures/auth": minor
---

BREAKING: collapse `GoogleCodeExchangeException`, `GoogleTokenException`, `GoogleServiceException`, and `GoogleNetworkException` into the canonical `AuthApiException` and `AuthNetworkException` shapes shared with `@neomaventures/mailbox`.

The four `Google*` exception classes are removed. Downstream HTTP failures from the OAuth token endpoint now throw `AuthApiException(statusCode, endpoint, message, context, responseBody)`; network-level failures throw `AuthNetworkException(endpoint, context, cause)`. The previous granular distinction (4xx vs 5xx vs missing-field vs missing-claim) is preserved on the exception instance as `context.phase` (`"codeExchange"` or `"idTokenDecode"`) and `context.missingField` / `context.missingClaim` for diagnostics. The wire response carries only `{ statusCode, message, error: "AuthApi" | "AuthNetwork" }` — no `endpoint`, `context`, or `responseBody` reaches the client.

**Migration for consumers wiring `errorTemplates`:**

Replace four keys with two:

```ts
ExceptionsModule.forRoot({
  errorTemplates: {
    AuthApiException: "errors/upstream-auth",
    AuthNetworkException: "errors/upstream-auth",
  },
})
```

**Migration for `try/catch` filters:** `if (e instanceof GoogleXxxException)` collapses to `if (e instanceof AuthApiException)`. Branch on `e.context.phase` and `e.context.missingField` / `e.context.missingClaim` if the call site needs the granular distinction.

Additionally, the `GoogleCallback()` interceptor now throws `BadRequestException` (instead of `GoogleCodeExchangeException`) when the OAuth callback URL is hit without a `code` query parameter — that case was always a client error, not a downstream failure.

The wire response for `EmailNotVerifiedException` and `InvalidMagicLinkTokenException` is also tightened: their previously-leaked `email` and `reason` fields are no longer part of the response body. Both remain available as public readonly instance properties for server logs and exception filters.
