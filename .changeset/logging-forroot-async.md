---
"@neoma/logging": minor
---

Add `LoggingModule.forRootAsync()` to resolve logging options from DI (e.g. a `ConfigService`), alongside the existing `forRoot()`. Also: the per-request trace id (header-provided or generated) now wins over a static `requestTraceId` in `logContext`, and the unused `LOGGING_MODULE_CONTEXT` export was removed.
