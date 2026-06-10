---
"@neomaventures/google-fixtures": minor
---

Breaking: `google.authorizeUrl()` signature changed from `(appUrl, clientId, scopes?)` to `(clientId, redirectUri, scopes)`. The redirect URI is now passed explicitly instead of being derived from `appUrl + /auth/google/callback`, and scopes are required.

New helpers: `google.requiredScopes()` returns `["openid"]`, `google.sensibleScopes()` returns `["openid", "email", "profile"]`.
