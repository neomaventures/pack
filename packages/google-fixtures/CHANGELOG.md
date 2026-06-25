# @neomaventures/google-fixtures

## 0.4.0

### Minor Changes

- 8104941: Add `GmailClient`, a MockServer helper that registers expectations for the Gmail labels endpoint using domain verbs (`expectLabel`, `expectLabelError`, `expectNetworkFailure`) instead of raw HTTP. Mirrors the existing `GoogleOAuthClient` shape; encapsulates the base-URL handling so callers no longer reach into `mockserver.baseUrl` directly. `expectNetworkFailure` drops the connection so consumers can exercise their network-error paths.
- 8104941: Add `gmail` namespace with `label()` fixture for testing Gmail Labels API responses.

  Used by `@neomaventures/mailbox` v0.1.0's `MailboxService.getStats()` to verify
  label stats parsing without hitting Gmail.

## 0.3.1

## 0.3.0

### Minor Changes

- c57fbdf: Breaking: `google.authorizeUrl()` signature changed from `(appUrl, clientId, scopes?)` to `(clientId, redirectUri, scopes)`. The redirect URI is now passed explicitly instead of being derived from `appUrl + /auth/google/callback`, and scopes are required.

  New helpers: `google.requiredScopes()` returns `["openid"]`, `google.sensibleScopes()` returns `["openid", "email", "profile"]`.

## 0.2.0

### Minor Changes

- cfeb742: New package: test fixtures for mocking Google OAuth APIs on top of @neomaventures/mockserver. Provides `google` data generators and `GoogleOAuthClient` MockServer helpers.
