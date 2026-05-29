---
"@neoma/exception-handling": minor
---

`NeomaExceptionFilter` now **injects `ApplicationLoggerService` from `@neoma/logging`** instead of using `Logger` from `@nestjs/common` statically. The internal `LoggerWrapper` and its `ConsoleLogger` detection are gone — the filter calls structured methods (`logger.warn(message, { err })`) directly. The unreachable `req.logger ??` branch and its corresponding spec describe block are removed.

**Breaking change to the `NeomaException` interface:** the `log` callback signature narrows from `LoggerService` to `ApplicationLoggerService`:

```ts
// Before
log?(logger: LoggerService): void

// After
log?(logger: ApplicationLoggerService): void
```

This gives consumers writing custom `NeomaException` implementations the full structured API (typed `req` field, typed structured methods). The runtime receives the same instance — only the type narrows.

Adds `@neoma/logging` as a **peerDependency**. Any app using `@neoma/exception-handling` must also install `@neoma/logging` (and `RequestContextModule.forRoot()` if it wants the `req` field on exception logs). This matches the broader Neoma ecosystem convention.

**Migration:**

- Add `@neoma/logging` to your application dependencies (it's now a peer of `@neoma/exception-handling`).
- Install `LoggingModule.forRoot()` + `RequestContextModule.forRoot()` in your root module.
- If you implement `NeomaException.log(logger)`, update the parameter type from `LoggerService` to `ApplicationLoggerService` (import from `@neoma/logging`).
