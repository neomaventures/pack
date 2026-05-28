---
"@neoma/garmr": minor
---

Auth middlewares (`BearerAuthenticationMiddleware`, `CookieAuthenticationMiddleware`) no longer probe `req.logger` to log authentication failures. They now call `Logger.warn(...)` from `@nestjs/common` with the middleware name as the context string.

The `Express.Request.logger` type augmentation has been removed from this package.

**Behaviour change worth noting:** authentication failures now log **unconditionally** via the static Nest Logger. Previously, if no logger was attached to the request (the common case in real consumer apps), the failure was silent. To route these logs into your structured logger, install it via `app.useLogger(...)` or `Logger.overrideLogger(...)`.

**Migration:** no consumer-facing API changed. If you depended on the silent-when-no-logger behaviour, install a no-op logger via `Logger.overrideLogger`.
