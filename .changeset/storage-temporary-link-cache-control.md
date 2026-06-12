---
"@neomaventures/storage": minor
---

Add `cacheControl` option to `@TemporaryLink()` and `linkCacheControl` to `StorageOptions`. The interceptor now sets a `Cache-Control` header on the 302 redirect before responding, letting browsers cache the redirect hop for a short window — useful for assets rendered repeatedly across pages (avatars, attachments). Per-route `cacheControl` overrides the global default; when neither is set no header is sent (existing behaviour preserved). The value is passed verbatim to `res.setHeader` — the package does not parse or validate it. Keep `max-age` shorter than `expiresIn` so the browser does not replay an expired presigned URL.
