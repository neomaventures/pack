---
"@neomaventures/auth": minor
---

Add `authorizeUrl` getter to `GoogleAuthService` and optional `scopes` config to `GoogleAuthOptions`.

`GoogleAuthService.authorizeUrl` returns a `URL` built from the configured client ID, redirect URI, and scopes — or `null` when Google OAuth is not configured. Scopes default to `["openid", "email", "profile"]` and can be overridden via the new `GoogleAuthOptions.scopes` array.
