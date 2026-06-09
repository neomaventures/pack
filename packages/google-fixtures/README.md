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

### Data generators

`google` provides fake data generators for unit and e2e tests — no MockServer required:

```typescript
import { google } from "@neomaventures/google-fixtures"

google.clientId()       // "12345678901-abc...xyz.apps.googleusercontent.com"
google.clientSecret()   // "abcdef-1234567890abcdefgh..."
google.code()           // "4/MTYzMjM0NTY3..."
google.idToken(claims?) // signed JWT with Google-shaped claims
google.accessToken()    // "1/MTYzMjM0NTY3..."
google.refreshToken()   // "1//MTYzMjM0NTY3..."
google.scopes()         // ["https://www.googleapis.com/auth/userinfo.email", ...]
```

`idToken()` accepts optional claims to override defaults:

```typescript
const token = google.idToken({
  email: "dan@example.com",
  name: "Dan",
  picture: "https://example.com/photo.jpg",
})
```

### MockServer helpers

`GoogleOAuthClient` wraps a `MockServerClient` to register expectations for Google's token endpoint:

```typescript
import { google, GoogleOAuthClient } from "@neomaventures/google-fixtures"
import { MockServerClient } from "@neomaventures/mockserver"

const mockserver = new MockServerClient("http://localhost:1080/mockserver")
const googleOAuth = new GoogleOAuthClient(mockserver)

// Mock successful code exchange
const tokens = await googleOAuth.mockCodeExchange({
  code: google.code(),
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  idToken: google.idToken({ email: "dan@example.com" }),
})

// tokens.access_token, tokens.id_token, etc.
```

### Mocking errors

```typescript
// HTTP error (e.g. invalid or expired code)
await googleOAuth.mockCodeExchangeHttpError({
  code,
  statusCode: 401,
  error: "invalid_grant",
})

// Network failure (connection dropped)
await googleOAuth.mockCodeExchangeNetworkError({ code })
```

### Configuring the token endpoint

Your app must have a configurable token endpoint so tests can point it at MockServer instead of Google. `@neomaventures/auth`'s `GoogleAuthOptions.tokenEndpoint` handles this.

```typescript
const tokenEndpoint = googleOAuth.tokenEndpoint()
// => "http://localhost:1080/token"
```

Pass this value as the `tokenEndpoint` option when configuring your auth module in tests.

## Types

- **`GoogleOAuthCodeExchangeResponse`** — shape of a successful token endpoint response
- **`GoogleOAuthCodeExchangeError`** — fixture type combining HTTP status code and error body
- **`GoogleIdTokenClaims`** — claims embedded in the Google ID token JWT

## Design

- **Separated concerns.** `google` provides data generators (no MockServer needed). `GoogleOAuthClient` provides MockServer expectations (requires a client).
- **Stateless client.** `GoogleOAuthClient` wraps a `MockServerClient` instance — construct once, use throughout your test suite.
- **Single-use by default.** Expectations are created with `remainingTimes: 1` because OAuth authorization codes are single-use. Override `times` if your test needs different behaviour.
- **Strict matching.** `mockCodeExchange` matches all five form parameters (`code`, `client_id`, `client_secret`, `redirect_uri`, `grant_type`) so a misconfigured test fails loudly. Error and network helpers match on `code` only, since the app may not send credentials for invalid codes.

## License

MIT
