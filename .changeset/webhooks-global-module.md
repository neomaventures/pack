---
"@neomaventures/webhooks": minor
---

**BREAKING**: `WebhooksModule.forRoot()` and `forRootAsync()` now register the module globally. `WEBHOOKS_OPTIONS` and `WebhookSignatureGuard` are available to all modules without explicit imports. Previously, using `@UseGuards(WebhookSignatureGuard)` in a controller outside the module that imported `WebhooksModule` would fail with a dependency resolution error.
