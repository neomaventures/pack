---
"@neomaventures/storage": minor
---

Add `default` option to `@TemporaryLink()`. When a handler returns `null` or `undefined`, the interceptor now redirects to the configured default URL instead of throwing. Useful for default avatars, cover images, and deleted-file placeholders. Without `default`, the existing strict contract is preserved — `null` still throws. The decorator also accepts an options object (`{ expiresIn, default }`) alongside the existing `@TemporaryLink()` and `@TemporaryLink(600)` shorthands.
