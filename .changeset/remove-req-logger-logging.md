---
"@neoma/logging": minor
---

Removed the `req.logger` middleware pattern. `RequestLoggerService`, `RequestLoggerMiddleware`, and the `Express.Request.logger` type augmentation are gone. `ApplicationLoggerService` is now the only logger and reads the current request from `@neoma/request-context` via `getRequest()`, attaching it as a `req` field on every log entry — no per-request logger instance is constructed any more.

Integration:

- Install as Nest's main logger: `app.useLogger(app.get(ApplicationLoggerService))` (use with `NestFactory.create(AppModule, { bufferLogs: true })` to capture bootstrap logs).
- Inject directly into consumer app code: `constructor(private logger: ApplicationLoggerService) {}`.
- Inside other `@neoma/*` packages, use `Logger` from `@nestjs/common` — calls route through whatever the consumer installed via `useLogger`.

Also dropped the unimplemented `logRequestTraceIdHeader` config option from `LoggingConfiguration`. Per-request trace ID support will return via a CustomSlot in `@neoma/request-context` — tracked in issue #69.

**Migration:**

- Anywhere you read `req.logger`, switch to either injecting `ApplicationLoggerService` or calling `Logger` from `@nestjs/common`.
- Drop any `LoggingModule` middleware wiring — it no longer exists.
- Remove `logRequestTraceIdHeader` from your `LoggingModule.forRoot()` options (it was never wired up; removing it is a no-op).
