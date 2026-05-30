---
"@neoma/logging": major
---

**Breaking:** `ApplicationLoggerService` no longer implements `@nestjs/common`'s `LoggerService` interface. It is **not** the app's main logger — `app.useLogger(applicationLoggerService)` will no longer type-check. Nest's own framework logs stay in Nest's `ConsoleLogger`; this service is the structured logger for application code and the Neoma ecosystem.

**Breaking:** every log method now has a uniform typed signature: `(message: string, context?: LogContext): void`. Printf-style interpolation is gone. To log an error, pass it in the context as `{ err }` — pino's default serializer extracts `{ type, message, stack }` automatically.

```ts
// Before
logger.log('User %s logged in', username)
logger.error('Charge failed', err.stack, 'Stripe')

// After
logger.log(`User ${username} logged in`)        // template literal
logger.log('User login', { username })           // structured (preferred)
logger.error('Charge failed', { err })           // err auto-serialised
```

**Added:** static delegates for non-DI code (decorators, utilities). Same signatures as the instance methods:

```ts
ApplicationLoggerService.log('Boot complete')
ApplicationLoggerService.error('Init failed', { err })
```

Static calls route through the constructed singleton and no-op silently if invoked before `LoggingModule.forRoot()` has been registered.

**Added:** exported `LogContext` type:

```ts
type LogContext = {
  /** Attached error — pino's default serializer extracts type/message/stack. */
  err?: unknown
} & Record<string, unknown>
```

**Added:** `info()` as an alias for `log()` for callers who prefer pino's naming.

**Migration:**

- Remove any `app.useLogger(applicationLoggerService)` calls (they no longer type-check).
- Rewrite printf-style calls as template literals or structured context.
- Convert any `error(msg, stackString, contextString)` calls to `error(msg, { err })`.
- Anywhere you imported `LoggerService` to type a parameter that received an `ApplicationLoggerService`, switch to `ApplicationLoggerService` directly (or `LogContext` for the context arg).

Closes #60, #67, #61.
