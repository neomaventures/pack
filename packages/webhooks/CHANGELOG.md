# @neomaventures/webhooks

## 0.1.0

### Minor Changes

- c98445f: **BREAKING:** `WebhooksModule.forRoot()` and `forRootAsync()` now register the module globally, making `WEBHOOKS_OPTIONS` and `WebhookSignatureGuard` available to sibling modules without re-importing.

## 0.0.1

### Patch Changes

- b01c502: Add `@neomaventures/webhooks` -- Svix-standard HMAC-SHA256 webhook signature verification for NestJS.

  Configure with `WebhooksModule.forRoot({ secret: "whsec_..." })` and apply `@UseGuards(WebhookSignatureGuard)` to webhook endpoints. Requires `rawBody: true` on the NestJS application factory.
