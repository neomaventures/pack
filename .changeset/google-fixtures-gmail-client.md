---
"@neomaventures/google-fixtures": minor
---

Add `GmailClient`, a MockServer helper that registers expectations for the Gmail labels endpoint using domain verbs (`expectLabel`, `expectLabelError`) instead of raw HTTP. Mirrors the existing `GoogleOAuthClient` shape; encapsulates the base-URL handling so callers no longer reach into `mockserver.baseUrl` directly.
