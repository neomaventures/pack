# @neoma/logging

Structured, typed logging for NestJS applications, powered by pino. Reads the current request from `@neoma/request-context` and attaches it as a `req` field on every log entry — no `Scope.REQUEST`, no `req.logger`, no `@Req()` threading.

## Why @neoma/logging?

- **Structured-only API** — every method has the same shape: `(message: string, context?: LogContext): void`. No printf, no positional context strings, no ambiguity at call sites.
- **Automatic request context** — log lines made during a request automatically carry `req`. Works in any default-scoped service, no `Scope.REQUEST` contagion.
- **`err` field convention** — pass an `Error` as `{ err }` and pino's default serializer extracts `{ type, message, stack }` for you.
- **Field redaction** — declarative path patterns mask sensitive data before serialization.
- **Static delegates** — `ApplicationLoggerService.log(...)` for decorators / non-DI code that still needs the structured pipeline.
- **High performance** — pino under the hood.

## Not Nest's app logger

`ApplicationLoggerService` deliberately does not implement `@nestjs/common`'s `LoggerService` interface. **Don't pass it to `app.useLogger(...)`** — that won't type-check, and isn't the intended integration. Nest's own framework logs (bootstrap, router exploration, etc.) continue to flow through Nest's `ConsoleLogger`; this service is the structured logger for **application code** and the rest of the Neoma ecosystem.

If you want one stream that captures everything, you can install a pino-compatible Nest logger separately. `@neoma/logging` doesn't compete in that space.

## Installation

```bash
pnpm add @neoma/logging @neoma/request-context
```

`@neoma/request-context` is a peer dependency — it's what gives `ApplicationLoggerService` access to the current request.

## Quick Start

Install both modules at the root. `RequestContextModule.forRoot()` must come before `LoggingModule.forRoot()` so the request-context boundary is in place when the logger reads from it:

```typescript
import { Module } from '@nestjs/common'
import { LoggingModule } from '@neoma/logging'
import { RequestContextModule } from '@neoma/request-context'

@Module({
  imports: [
    RequestContextModule.forRoot(),  // required for `req` on log entries
    LoggingModule.forRoot({
      logLevel: 'debug',
      logContext: { service: 'api', version: '1.0.0' },
    }),
  ],
})
export class AppModule {}
```

## Using the logger

Inject `ApplicationLoggerService` and call the typed methods:

```typescript
import { Injectable } from '@nestjs/common'
import { ApplicationLoggerService } from '@neoma/logging'

@Injectable()
export class UsersService {
  constructor(private readonly logger: ApplicationLoggerService) {}

  async createUser(data: CreateUserDto) {
    this.logger.log('Creating user', { email: data.email })

    try {
      const user = await this.repo.save(data)
      this.logger.log('User created', { userId: user.id })
      return user
    } catch (err) {
      this.logger.error('User creation failed', { err, email: data.email })
      throw err
    }
  }
}
```

Every entry inside a request automatically gets `req` (method, url, headers, etc.) attached:

```json
{
  "level": 30,
  "msg": "Creating user",
  "email": "user@example.com",
  "service": "api",
  "version": "1.0.0",
  "req": { "method": "POST", "url": "/users", "headers": { ... } }
}
```

### Static delegates

Decorators, utility functions, and other non-DI code can use the static delegates — same structured contract, no DI required:

```typescript
import { ApplicationLoggerService } from '@neoma/logging'

export function logBoot(stage: string) {
  ApplicationLoggerService.log('Boot stage', { stage })
}
```

Static calls route through the constructed singleton. They no-op silently if called before `LoggingModule.forRoot()` has been registered (e.g. at module-init time before the app is bootstrapped).

## API

### Method signatures

Every log method has the same shape:

```typescript
class ApplicationLoggerService {
  log(message: string, context?: LogContext): void
  info(message: string, context?: LogContext): void   // alias for log
  warn(message: string, context?: LogContext): void
  debug(message: string, context?: LogContext): void
  verbose(message: string, context?: LogContext): void
  error(message: string, context?: LogContext): void
  fatal(message: string, context?: LogContext): void

  // Static delegates with the same shape:
  static log(message: string, context?: LogContext): void
  // ... etc
}
```

### LogContext

```typescript
type LogContext = {
  /**
   * Attached error. When this is an `Error`, pino's default serializer
   * extracts { type, message, stack } into the log entry.
   */
  err?: unknown
} & Record<string, unknown>
```

Any keys allowed. `err` is called out because pino's default `err` serializer auto-extracts an attached `Error`'s structured shape.

### Logging errors

Put the error in the context as `err`:

```typescript
try {
  await chargeCard(amount)
} catch (err) {
  this.logger.error('Charge failed', { err, chargeId, amount })
}
```

Output:

```json
{
  "level": 50,
  "msg": "Charge failed",
  "chargeId": "ch_abc",
  "amount": 4900,
  "err": {
    "type": "StripeCardError",
    "message": "Your card was declined.",
    "stack": "StripeCardError: Your card was declined.\n    at ..."
  }
}
```

Works for any field named `err` — caught exception, programmatic error wrapper, anything. If the value isn't an `Error` instance, pino logs it as-is.

## Configuration

### Log levels

```typescript
LoggingModule.forRoot({ logLevel: 'warn' })
```

Available levels, most to least verbose: `verbose`, `debug`, `log` (default), `warn`, `error`, `fatal`. `verbose` maps to pino's `trace`; `log` maps to pino's `info`.

When `logLevel: 'debug'`, the `RequestLoggerInterceptor` automatically logs each incoming request's dispatch and completion.

### Field redaction

```typescript
LoggingModule.forRoot({
  logRedact: [
    'password',         // top-level field
    '*.password',       // any single-level nested field
    'user.ssn',         // explicit nested path
    'tokens.*.secret',  // wildcard over array/object children
    'medicalRecords.*', // all children of a parent
  ],
})
```

Redacted values appear in output as `"[REDACTED]"`. Redaction is applied by pino before serialization, so the original objects aren't mutated.

### Global context

Add fields included on every log entry:

```typescript
LoggingModule.forRoot({
  logContext: {
    service: 'user-api',
    version: '1.2.3',
    environment: process.env.NODE_ENV,
  },
})
```

### Automatic request logging

With `logLevel: 'debug'`, every request gets logged at dispatch and completion via `RequestLoggerInterceptor`:

```json
{"level":20,"msg":"Processing an incoming request...","controller":{"name":"UsersController","path":"users"},"handler":{"name":"create","path":"/"},"req":{"method":"POST","url":"/users"}}
{"level":20,"msg":"Processed an incoming request that was successfully handled...","res":{"statusCode":201},"duration":"45ms"}
```

### Error interceptor

When `logErrors: true`, the interceptor also logs exceptions thrown during request handling:

```typescript
LoggingModule.forRoot({
  logLevel: 'debug',
  logErrors: true,
})
```

## Async configuration

```typescript
LoggingModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    logLevel: config.get('LOG_LEVEL'),
    logRedact: ['password', '*.secret'],
  }),
})
```

## Testing

Use `ArrayStream` from the shipped fixtures to capture log output in memory:

```typescript
import { Test } from '@nestjs/testing'
import { LoggingModule, ApplicationLoggerService } from '@neoma/logging'
import { RequestContextModule } from '@neoma/request-context'
import { ArrayStream } from '@neoma/logging/fixtures'

describe('UsersService', () => {
  let logger: ApplicationLoggerService
  const logs: any[] = []

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        RequestContextModule.forRoot(),
        LoggingModule.forRoot({ logDestination: new ArrayStream(logs) }),
      ],
    }).compile()

    logger = module.get(ApplicationLoggerService)
  })

  it('logs structured fields', () => {
    logger.log('User created', { userId: '123' })

    expect(logs).toContainEqual(
      expect.objectContaining({
        level: 30,
        msg: 'User created',
        userId: '123',
      }),
    )
  })
})
```

For unit specs that don't need the full module, override the provider:

```typescript
const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), /* ... */ }

const module = await Test.createTestingModule({
  providers: [
    UsersService,
    { provide: ApplicationLoggerService, useValue: mockLogger },
  ],
}).compile()
```

## Configuration reference

```typescript
interface LoggingConfiguration {
  /**
   * Minimum log level to capture. Setting to 'debug' enables automatic
   * request-boundary logging via RequestLoggerInterceptor.
   * @default 'log'
   */
  logLevel?: 'verbose' | 'debug' | 'log' | 'warn' | 'error' | 'fatal'

  /**
   * Custom destination for log output (primarily for testing with ArrayStream).
   * @default process.stdout
   */
  logDestination?: any

  /**
   * Fields to redact from logs. Supports dot notation and wildcards.
   * @default []
   */
  logRedact?: string[]

  /**
   * Global context merged into every log entry.
   * @default {}
   */
  logContext?: any

  /**
   * Whether RequestLoggerInterceptor logs uncaught errors from route handlers.
   * @default false
   */
  logErrors?: boolean
}
```

## Requirements

- Node.js >= 22
- NestJS 11.x
- `@neoma/request-context` (peer dependency)

## License

MIT — see [LICENSE](./LICENSE).
