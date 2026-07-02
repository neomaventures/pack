---
"@neomaventures/google-fixtures": minor
---

`GoogleOAuthClient.mockCodeExchange` now accepts an optional `scopes` array, embedded into the mocked token-response's space-separated `scope` field. Defaults to `google.scopes()` so existing callers are unaffected. Tests covering app-level features that depend on additional scopes (e.g. `gmail.readonly`) pass them through here so the resulting `OAuthToken.scopes` row reflects what the user "granted" at consent.
