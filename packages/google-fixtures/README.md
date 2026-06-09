# @neomaventures/google-fixtures

Test fixtures for mocking Google OAuth APIs on top of `@neomaventures/mockserver`. Eliminates the boilerplate of setting up MockServer expectations for Google's token endpoint in e2e and UI specs.

## Installation

```bash
pnpm add -D @neomaventures/google-fixtures @neomaventures/mockserver
```

### Dependencies

- `@faker-js/faker` — randomized test data
- `jsonwebtoken` — ID token signing
- `@neomaventures/mockserver` (peer) — MockServer client and container lifecycle

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

// tokens.access_token, tokens.id_token, etc.
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
GoogleOAuth.clientId()       // "12345678901-abc...xyz.apps.googleusercontent.com"
GoogleOAuth.clientSecret()   // "abcdef-1234567890abcdefgh..."
GoogleOAuth.code()           // "4/MTYzMjM0NTY3..."
GoogleOAuth.idToken(claims?) // signed JWT with Google-shaped claims
GoogleOAuth.accessToken()    // "1/MTYzMjM0NTY3..."
GoogleOAuth.refreshToken()   // "1//MTYzMjM0NTY3..."
GoogleOAuth.scopes()         // ["https://www.googleapis.com/auth/userinfo.email", ...]
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
- **Strict matching.** `mockCodeExchange` matches all five form parameters (`code`, `client_id`, `client_secret`, `redirect_uri`, `grant_type`) so a misconfigured test fails loudly. Error and network helpers match on `code` only, since the app may not send credentials for invalid codes.

## License

MIT
