---
"@neomaventures/auth": minor
---

Persist OAuth tokens from Google code exchange onto the authenticated principal.

`GoogleAuthService.authenticate()` now captures `access_token`, `refresh_token`, `expires_in`, and `scope` from Google's token response and writes them to the principal's `oauthTokens` JSON column. Consumer entities that want this behaviour should implement the new `OAuthAuthenticatable` interface, which adds an optional `oauthTokens?: StoredOAuthToken[]` field on top of `Authenticatable`. Entities that don't implement it are unaffected — the upsert is a no-op when the property is absent.

A new `OAuthTokenService` and matching `@OAuthToken(provider)` parameter decorator expose the active token for the current principal:

```ts
@Get("inbox/count")
@Authenticated()
public count(@OAuthToken("google") token: OAuthTokenSnapshot | null): unknown {
  if (!token) return { count: 0 }
  return this.gmail.getCount(token.accessToken)
}
```

The snapshot omits `refreshToken` — that's internal to the package's future refresh logic (#171). When the stored `expiresAt` is in the past, both the service and decorator return `null`.

The refresh-token preservation is intentional: Google only returns `refresh_token` on first consent / re-consent, so on subsequent logins the upsert preserves the existing refresh token rather than nulling it.

Consumers using Google OAuth should add a `simple-json` column to their principal entity (named `oauthTokens`) via a migration. The auth package does not ship migrations.
