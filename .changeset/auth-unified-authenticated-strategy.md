---
"@neomaventures/auth": minor
---

Unified `@Authenticated()` strategy: per-route `onUnauthenticated` + `AuthModule.forRoot({ onUnauthenticated: ... })` default with class-decorator factory.

BREAKING: `Authenticated` is now a decorator factory, not a guard class. Migration: `@UseGuards(new Authenticated("/x"))` → `@Authenticated({ onUnauthenticated: "/x" })`. `@UseGuards(new Authenticated())` → `@Authenticated()`.

`UnauthorizedRedirectException` now includes the redirect target in its response body (`{ statusCode, message, redirect: { url, status } }`) so consumers can observe the intended redirect without a redirect-aware exception filter. Consumers using `@neomaventures/exceptions` are unaffected — the 303 redirect still triggers via `getRedirect()`.

`AuthenticatedGuard` now builds a resource-aware message in the form `Unauthenticated, access to resource <request-url> denied` and passes it into every exception it throws (`UnauthorizedException`, `UnauthorizedRedirectException`, and any class strategy), so server logs and the response body carry context about which resource was denied. The previous default `UnauthorizedException` text ("Unable to authenticate a principal...") is replaced by this resource-aware message.

BREAKING: `RequiresPermissionGuard` is no longer a public export. The decorator-only pattern is now uniform across the package — use `@RequiresPermission()` / `@RequiresAnyPermission()` instead. Tests that previously bypassed the guard by overriding it should mock via the principal slot instead.
