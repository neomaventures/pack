# Changelog

## 0.3.1

### Patch Changes

- cfeb742: Migrate Google OAuth test fixtures to `@neomaventures/google-fixtures`. No API changes — internal test refactor only.

## 0.3.0

### Minor Changes

- b01c502: **Breaking:** Remove `WebhookSignatureGuard` and `WebhookOptions` from `@neomaventures/auth`. Webhook signature verification has moved to `@neomaventures/webhooks`.

  Migration: replace `webhook: { secret }` on `AuthModule.forRoot()` with a separate `WebhooksModule.forRoot({ secret })` import from `@neomaventures/webhooks`, and update guard imports to `import { WebhookSignatureGuard } from "@neomaventures/webhooks"`.

## 0.2.0

### Minor Changes

- a9c9bee: Register principal slot via `@neomaventures/request-context`'s `createContextSlot` kit. Adds `getPrincipal()` accessor, `CurrentPrincipal` injection token, and reimplements `@Principal()` decorator on the ALS-backed slot. Auth middlewares dual-write to both `req.principal` and the slot. Guards read from `getPrincipal()`. `req.principal` is deprecated but continues to work. `@Principal()` now returns `undefined` instead of throwing when no principal exists. `@neomaventures/request-context` is now a peer dependency.

## 0.1.1

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
