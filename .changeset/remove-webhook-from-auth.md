---
"@neomaventures/auth": minor
---

**Breaking:** Remove `WebhookSignatureGuard` and `WebhookOptions` from `@neomaventures/auth`. Webhook signature verification has moved to `@neomaventures/webhooks`.

Migration: replace `webhook: { secret }` on `AuthModule.forRoot()` with a separate `WebhooksModule.forRoot({ secret })` import from `@neomaventures/webhooks`, and update guard imports to `import { WebhookSignatureGuard } from "@neomaventures/webhooks"`.
