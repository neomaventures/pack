# @neomaventures/google-fixtures

## 0.3.0

### Minor Changes

- c57fbdf: Breaking: `google.authorizeUrl()` signature changed from `(appUrl, clientId, scopes?)` to `(clientId, redirectUri, scopes)`. The redirect URI is now passed explicitly instead of being derived from `appUrl + /auth/google/callback`, and scopes are required.

  New helpers: `google.requiredScopes()` returns `["openid"]`, `google.sensibleScopes()` returns `["openid", "email", "profile"]`.

## 0.2.0

### Minor Changes

- cfeb742: New package: test fixtures for mocking Google OAuth APIs on top of @neomaventures/mockserver. Provides `google` data generators and `GoogleOAuthClient` MockServer helpers.
