---
"@neoma/logging": minor
---

Removed the `req.logger` middleware pattern. `RequestLoggerService`, `RequestLoggerMiddleware`, and the `Express.Request.logger` type augmentation are gone. `ApplicationLoggerService` is now the only logger and reads the current request from `@neoma/request-context` via `getRequest()`, attaching it as a `req` field on every log entry — no per-request logger instance is constructed any more.

**Required companion: `@neoma/request-context`.** `ApplicationLoggerService` relies on `getRequest()` returning the live request, which only works if the consumer also installs the request-context boundary:

```ts
imports: [
  RequestContextModule.forRoot(),  // required for req to appear on log entries
  LoggingModule.forRoot({ logLevel: "debug" }),
]
```

Without `RequestContextModule.forRoot()`, log entries still emit but `req` will always be absent.

**Integration:**

- Install as Nest's main logger: `app.useLogger(app.get(ApplicationLoggerService))` (use with `NestFactory.create(AppModule, { bufferLogs: true })` to capture bootstrap logs).
- Inject directly into consumer app code: `constructor(private logger: ApplicationLoggerService) {}`.
- **Inside other `@neoma/*` packages, also inject `ApplicationLoggerService`.** Each Neoma package declares `@neoma/logging` as a peerDependency. Consumers install `LoggingModule.forRoot()` once at the root.

Also dropped the unimplemented `logRequestTraceIdHeader` config option from `LoggingConfiguration`. Per-request trace ID support will return via a CustomSlot in `@neoma/request-context` — tracked in issue #69.

**Migration:**

- Anywhere you read `req.logger`, switch to injecting `ApplicationLoggerService`.
- Add `RequestContextModule.forRoot()` to your root imports if you want `req` on log entries.
- Drop any `LoggingModule` middleware wiring — it no longer exists.
- Remove `logRequestTraceIdHeader` from your `LoggingModule.forRoot()` options (it was never wired up; removing it is a no-op).
