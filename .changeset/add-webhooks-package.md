---
"@neomaventures/webhooks": patch
---

Add `@neomaventures/webhooks` -- Svix-standard HMAC-SHA256 webhook signature verification for NestJS.

Configure with `WebhooksModule.forRoot({ secret: "whsec_..." })` and apply `@UseGuards(WebhookSignatureGuard)` to webhook endpoints. Requires `rawBody: true` on the NestJS application factory.
