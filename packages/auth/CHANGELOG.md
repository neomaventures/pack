# Changelog

## 0.5.0

### Minor Changes

- e0a9784: Unified `@Authenticated()` strategy: per-route `onUnauthenticated` + `AuthModule.forRoot({ onUnauthenticated: ... })` default with class-decorator factory.

  BREAKING: `Authenticated` is now a decorator factory, not a guard class. Migration: `@UseGuards(new Authenticated("/x"))` → `@Authenticated({ onUnauthenticated: "/x" })`. `@UseGuards(new Authenticated())` → `@Authenticated()`.

  `UnauthorizedRedirectException` now includes the redirect target in its response body (`{ statusCode, message, redirect: { url, status } }`) so consumers can observe the intended redirect without a redirect-aware exception filter. Consumers using `@neomaventures/exceptions` are unaffected — the 303 redirect still triggers via `getRedirect()`.

  `AuthenticatedGuard` now builds a resource-aware message in the form `Unauthenticated, access to resource <request-url> denied` and passes it into every exception it throws (`UnauthorizedException`, `UnauthorizedRedirectException`, and any class strategy), so server logs and the response body carry context about which resource was denied. The previous default `UnauthorizedException` text ("Unable to authenticate a principal...") is replaced by this resource-aware message.

  BREAKING: `RequiresPermissionGuard` is no longer a public export. The decorator-only pattern is now uniform across the package — use `@RequiresPermission()` / `@RequiresAnyPermission()` instead. Tests that previously bypassed the guard by overriding it should mock via the principal slot instead.

## 0.4.0

### Minor Changes

- c57fbdf: Add `authorizeUrl` getter to `GoogleAuthService` and optional `scopes` config to `GoogleAuthOptions`.

  `GoogleAuthService.authorizeUrl` returns a `URL` built from the configured client ID, redirect URI, and scopes — or `null` when Google OAuth is not configured. Scopes default to `["openid", "email", "profile"]` and can be overridden via the new `GoogleAuthOptions.scopes` array.

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
