---
"@neomaventures/webhooks": minor
---

**BREAKING:** `WebhooksModule.forRoot()` and `forRootAsync()` now register the module globally, making `WEBHOOKS_OPTIONS` and `WebhookSignatureGuard` available to sibling modules without re-importing.
