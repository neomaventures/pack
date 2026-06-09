# @neomaventures/google-fixtures

Test fixtures for mocking Google OAuth APIs on top of `@neomaventures/mockserver`. Eliminates the boilerplate of setting up MockServer expectations for Google's token endpoint in e2e and UI specs.

## Installation

```bash
pnpm add -D @neomaventures/google-fixtures
```

### Dependencies

- `@neomaventures/mockserver` — MockServer client and container lifecycle
- `@faker-js/faker` — randomized test data
- `jsonwebtoken` — ID token signing

## Usage

### Mocking a successful code exchange

```typescript
import { MockServerClient } from "@neomaventures/mockserver"
import { GoogleOAuth } from "@neomaventures/google-fixtures"

const client = new MockServerClient(mockserverUrl)
const code = GoogleOAuth.code()

const tokens = await GoogleOAuth.mockCodeExchange(client, {
  code,
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  idToken: GoogleOAuth.idToken({ email: "dan@example.com" }),
})

// tokens.access_token, tokens.id_token, tokens.refresh_token, etc.
```

The expectation uses strict form parameter matching (`code`, `client_id`, `client_secret`, `redirect_uri`, `grant_type`) and defaults to `times: { remainingTimes: 1 }` — matching Google's single-use authorization codes.

### Mocking errors

```typescript
// HTTP error (e.g. invalid or expired code)
await GoogleOAuth.mockCodeExchangeHttpError(client, {
  code,
  statusCode: 401,
  error: "invalid_grant",
})

// Network failure (connection dropped)
await GoogleOAuth.mockCodeExchangeNetworkError(client, { code })
```

### Configuring the token endpoint

Your app must have a configurable token endpoint so tests can point it at MockServer instead of Google. `@neomaventures/auth`'s `GoogleAuthOptions.tokenEndpoint` handles this.

```typescript
const tokenEndpoint = GoogleOAuth.tokenEndpoint(mockserverBaseUrl)
// => "http://localhost:1080/token" (or similar)
```

Pass this value as the `tokenEndpoint` option when configuring your auth module in tests.

### Data generators

`GoogleOAuth` exposes static methods for generating realistic test data:

```typescript
GoogleOAuth.clientId()       // "123456789.apps.googleusercontent.com"
GoogleOAuth.clientSecret()   // "GOCSPX-..."
GoogleOAuth.code()           // "4/0AX4XfW..."
GoogleOAuth.idToken(claims?) // signed JWT with Google-shaped claims
GoogleOAuth.accessToken()    // "ya29.a0AfH..."
GoogleOAuth.refreshToken()   // "1//0eXy..."
GoogleOAuth.scopes()         // ["openid", "email", "profile"]
```

`idToken()` accepts optional claims to override defaults:

```typescript
const token = GoogleOAuth.idToken({
  email: "dan@example.com",
  name: "Dan",
  picture: "https://example.com/photo.jpg",
})
```

## Types

- **`GoogleOAuthCodeExchangeResponse`** — shape of a successful token endpoint response
- **`GoogleOAuthCodeExchangeError`** — shape of an error response from the token endpoint
- **`GoogleIdTokenClaims`** — claims embedded in the Google ID token JWT

## Design

- **Stateless.** `MockServerClient` is passed explicitly to every call — no shared state. Works identically in Jest and Playwright.
- **Single-use by default.** Expectations are created with `remainingTimes: 1` because OAuth authorization codes are single-use. Override `times` if your test needs different behaviour.
- **Strict matching.** Every form parameter (`code`, `client_id`, `client_secret`, `redirect_uri`, `grant_type`) must match. A misconfigured test fails with a clear "no matching expectation" error rather than silently succeeding.

## License

MIT
