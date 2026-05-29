---
"@neoma/garmr": minor
---

Auth middlewares (`BearerAuthenticationMiddleware`, `CookieAuthenticationMiddleware`) no longer probe `req.logger` to log authentication failures. They now **inject `ApplicationLoggerService` from `@neoma/logging`** and call `this.logger.warn("msg", { err })` — clean structured logging on the failure path.

Adds `@neoma/logging` as a **peerDependency**: any app that imports `@neoma/garmr` must also install `@neoma/logging` (and `RequestContextModule.forRoot()` for request-scoped fields). This matches the broader Neoma ecosystem convention — Neoma packages inject `ApplicationLoggerService` rather than reaching for `Logger` from `@nestjs/common`.

The `Express.Request.logger` type augmentation has been removed from this package.

**Behaviour change worth noting:** authentication failures now log **unconditionally** via the injected logger. Previously, if no logger was attached to the request (the common case in real consumer apps), the failure was silent.

**Migration:**

- Add `@neoma/logging` to your application dependencies (it's now a peer of `@neoma/garmr`).
- Install `LoggingModule.forRoot()` + `RequestContextModule.forRoot()` in your root module.
- No consumer-facing API changed.
