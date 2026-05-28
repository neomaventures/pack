---
"@neoma/exception-handling": patch
---

Dropped the dead `request.logger ??` fallback in `NeomaExceptionFilter`. In practice this branch was always unreachable in real consumer apps since `req.logger` was never populated outside of `@neoma/logging`'s middleware (now removed). The filter now uses `Logger` from `@nestjs/common` directly; route through your own implementation via `Logger.overrideLogger(...)` or `app.useLogger(...)`.

Documentation cleaned up across `ExceptionHandlerModule`, `NeomaExceptionFilter`, and the `NeomaException` interface to remove `req.logger` references.

No consumer-facing behaviour change.
