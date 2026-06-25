# @neomaventures/exceptions

> Automatic exception handling and intelligent logging for NestJS applications

Laravel-inspired global exception handling that provides consistent error responses and smart logging based on error severity.

## Design Principle

The filter follows a **dynamic over static over defaults** priority:

1. **Dynamic** — the exception itself declares behaviour at runtime via `NeomaException` methods (`getStatus()`, `getResponse()`, `getRedirect()`, `log()`)
2. **Static** — route-level configuration set at definition time via decorators like `@ErrorTemplate`
3. **Defaults** — framework defaults (500 status, generic JSON body, status-based logging)

The exception always has more context than the route decorator, so it gets first say. The decorator provides sensible defaults for when the exception doesn't have an opinion.

## Motivation

NestJS's default exception handling works, but lacks sophisticated logging patterns that differentiate between client errors (404s, validation errors) and server errors (500s, unhandled exceptions). Every production application needs:

- Consistent error response formatting
- Different log levels for different error types (404s shouldn't alarm you at 3am)
- Rich contextual logging with request details
- Zero boilerplate in your controllers

`@neomaventures/exceptions` provides Laravel-quality exception handling for NestJS with a single import.

## The Problem

**Without this package:**

```typescript
// app.module.ts - No global exception handling
import { Module } from '@nestjs/common'

@Module({
  controllers: [UserController],
})
export class AppModule {}

// Your controller
@Get('users/:id')
async getUser(@Param('id') id: string) {
  const user = await this.users.findOne(id)
  if (!user) {
    // Throws NotFoundException, logs at ERROR level
    // 404s flood your error monitoring
    throw new NotFoundException('User not found')
  }
  return user
}
```

**Result:**
- All exceptions logged at the same level
- No request context in logs
- No differentiation between client errors and server errors
- Manual error handling in every controller

## The Solution

**With this package:**

```typescript
// app.module.ts - One-line setup
import { Module } from '@nestjs/common'
import { ExceptionHandlerModule } from '@neomaventures/exceptions'

@Module({
  imports: [ExceptionHandlerModule.forRoot({})],
  controllers: [UserController],
})
export class AppModule {}

// Your controller - unchanged
@Get('users/:id')
async getUser(@Param('id') id: string) {
  const user = await this.users.findOne(id)
  if (!user) {
    // Now automatically logged at DEBUG level with request context
    throw new NotFoundException('User not found')
  }
  return user
}
```

**Result:**
- ✅ 404s logged at DEBUG level (not in your error monitoring)
- ✅ 4xx errors logged at WARN level (client issues)
- ✅ 5xx errors logged at ERROR level (your problems)
- ✅ Full request context in every log
- ✅ Consistent error response format
- ✅ Zero controller boilerplate

## Installation

`@neomaventures/*` packages publish privately to GitHub Packages. Configure `.npmrc` to resolve the `@neoma` scope first:

```
@neomaventures:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then install:

```bash
npm install @neomaventures/exceptions
```

### Peer Dependencies

```bash
npm install class-validator class-transformer
```

These are required for the built-in global validation pipe.

## Basic Usage

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common'
import { ExceptionHandlerModule } from '@neomaventures/exceptions'

@Module({
  imports: [ExceptionHandlerModule.forRoot({})],
})
export class AppModule {}
```

That's it. All exceptions are now handled automatically. See [Module import order](#module-import-order) for one wiring constraint to be aware of when combining with other guard-registering modules, and [Global error templates](#global-error-templates) for the safety-net fallback that closes that gap.

### 2. Throw Exceptions Anywhere

```typescript
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException
} from '@nestjs/common'

@Controller('users')
export class UserController {
  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.users.findOne(id)

    if (!user) {
      // Logged at DEBUG level
      throw new NotFoundException('User not found')
    }

    return user
  }

  @Post()
  async createUser(@Body() dto: CreateUserDto) {
    if (!dto.email) {
      // Logged at WARN level
      throw new BadRequestException('Email is required')
    }

    // Unhandled errors logged at ERROR level
    return await this.users.create(dto)
  }
}
```

## Module import order

`ExceptionHandlerModule` registers an internal `APP_GUARD` to resolve `@ErrorTemplate` metadata before request handlers run. NestJS executes `APP_GUARD` providers in registration order, so import `ExceptionHandlerModule` **before** any other module that registers its own throwing `APP_GUARD`. If a consumer guard throws before the internal resolver runs, the filter will fall through to JSON instead of rendering the configured template.

For applications that want a safety net regardless of guard ordering — and for exceptions thrown by middleware or for unmatched routes, which never see route-level metadata — configure [Global error templates](#global-error-templates) via `forRoot({ errorTemplates })`.

## Global error templates

`forRoot({ errorTemplates })` provides a global HTML fallback rendered when no route-level `@ErrorTemplate` is reachable. It covers three cases that route metadata can never address:

- Middleware that throws before any route binds
- Guards that throw before the internal metadata bridge runs
- Unmatched routes (no controller, no decorator)

```typescript
import { ExceptionHandlerModule } from '@neomaventures/exceptions'

@Module({
  imports: [
    ExceptionHandlerModule.forRoot({
      errorTemplates: {
        default: 'errors/generic',
        404: 'errors/404',
        500: 'errors/server',
      },
    }),
  ],
})
export class AppModule {}
```

### Resolution ladder

When the request accepts `text/html`, the filter resolves the response in this order:

1. **Exception `getRedirect()`** — the exception itself declares a redirect target
2. **Route-level `@ErrorTemplate`** — matched by `err.name`, then `default`
3. **Global `errorTemplates`** — matched by HTTP status, then `default`
4. **JSON fallback** — when nothing above matched

Route-level metadata, when present, always wins over the global fallback. Exception-declared redirects always win over both.

### Path values trigger redirects

Values starting with `/` trigger a `303 See Other` redirect to that path instead of rendering. This works for both the `default` entry and status-keyed entries:

```typescript
ExceptionHandlerModule.forRoot({
  errorTemplates: {
    default: 'errors/generic',
    404: '/not-found',
  },
})
```

### Key-shape asymmetry

Route-level `@ErrorTemplate` is keyed by **exception name** (`BadRequestException`, `UnauthorizedException`, …). Global `errorTemplates` is keyed by **HTTP status code** (`404`, `500`, …). The shapes differ on purpose: at the route, the developer knows which exception types they expect; at the app boundary, the catch-all care is what status is being returned.

### Opt-in

Without `errorTemplates`, the filter behaviour is unchanged from earlier releases — middleware-thrown exceptions, unmatched routes, and pre-bridge guard throws all return JSON. Pass `forRoot({})` with no options to keep the old behaviour, or pass `errorTemplates` to opt in.

### Migration from earlier releases

Bare `imports: [ExceptionHandlerModule]` no longer compiles. Replace with `imports: [ExceptionHandlerModule.forRoot({})]` for a no-op upgrade, or pass `errorTemplates` to opt in to the new fallback.

## How It Works

### Logging Levels

The exception filter intelligently logs based on HTTP status code:

| Status Code | Log Level | Example Exceptions | Rationale |
|-------------|-----------|-------------------|-----------|
| 404 | `DEBUG` | `NotFoundException` | Expected in normal operation, not an error |
| 400-499 | `WARN` | `BadRequestException`, `UnauthorizedException` | Client errors, worth monitoring |
| 500-599 | `ERROR` | `InternalServerErrorException` | Server errors, needs immediate attention |
| Non-HTTP | `ERROR` | `TypeError`, `ReferenceError` | Unhandled exceptions, critical |

### Log Format

Each log includes:
- **Status code** - For quick filtering
- **Error type** - The exception class name
- **Error details** - Full error object with message and stack trace
- **Request context** - HTTP method, URL, headers, etc.

Example log output:
```
ERROR [500 Request failed - InternalServerErrorException] {
  err: InternalServerErrorException: Database connection failed
      at UserService.findOne (src/users/user.service.ts:42:15)
      at UserController.getUser (src/users/user.controller.ts:18:29)
      ... stack trace ...
  req: {
    method: 'GET',
    url: '/users/123',
    headers: { ... }
  }
}
```

### Response Format

**JSON (default)** - All exceptions return consistent JSON responses:

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

For unhandled (non-HTTP) exceptions:

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

**HTML** - When the request accepts `text/html` and the route has an `@ErrorTemplate` decorator, the filter renders a template instead. See [Content Negotiation](#content-negotiation) for details.

### Validation

The module registers a global `ValidationPipe` that transforms validation errors into a field-keyed shape:

```json
{
  "email": { "value": "bad", "error": "must be a valid email" },
  "name": { "value": "ab", "error": "must be at least 5 characters" }
}
```

This is more useful than the NestJS default (`{ message: ["must be valid"] }`) for both templates (inline field errors) and APIs (programmatic field mapping).

### Content Negotiation

Use the `@ErrorTemplate` decorator to render HTML error pages for browser requests while keeping JSON responses for API consumers:

```typescript
import { ErrorTemplate } from '@neomaventures/exceptions'

@Controller('auth')
export class AuthController {
  // Single template for all errors
  @ErrorTemplate('auth/magic-link')
  @Post('magic-link')
  public sendMagicLink(@Body() dto: SendMagicLinkDto) {}

  // Per-exception-type templates with a required default fallback
  @ErrorTemplate({
    BadRequestException: 'auth/login',
    default: 'errors/500',
  })
  @Post('login')
  public login(@Body() dto: LoginDto) {}

  // Template with static locals
  @ErrorTemplate('auth/magic-link', {
    formAction: '/auth/magic-link',
    pageTitle: 'Sign In',
  })
  @Post('magic-link')
  public sendMagicLink(@Body() dto: SendMagicLinkDto) {}
}
```

When an exception occurs and the client accepts `text/html`, the filter resolves the template:
- **String**: renders that template for all errors
- **Options object**: matches `err.name` against the keys, falls back to `default`
- **`/` prefix**: values starting with `/` trigger a `303 See Other` redirect instead of rendering

```typescript
@ErrorTemplate({
  BadRequestException: 'auth/magic-link',   // renders template
  default: '/error',                         // redirects to /error
})
```

API clients (`Accept: application/json`) always receive JSON as usual.

The template receives `res.locals` spread into the render context, plus an `exception` property containing the error response object.

### Exception-Level Redirects

Exceptions can carry their own redirect instruction via the `getRedirect()` method. When the request accepts `text/html` and the exception implements `getRedirect()` returning `{ status, url }`, the filter redirects instead of rendering a template or returning JSON. This takes priority over `@ErrorTemplate`.

```typescript
import { HttpStatus } from '@nestjs/common'
import { NeomaException } from '@neomaventures/exceptions'

export class UnauthenticatedException extends Error implements NeomaException {
  public constructor() {
    super('Authentication required')
    this.name = 'UnauthenticatedException'
  }

  public getStatus(): number {
    return HttpStatus.UNAUTHORIZED
  }

  public getResponse(): object {
    return {
      statusCode: HttpStatus.UNAUTHORIZED,
      message: this.message,
      error: 'Unauthorized',
    }
  }

  public getRedirect(): { status: number; url: string } {
    return { status: HttpStatus.SEE_OTHER, url: '/login' }
  }
}
```

This is useful when the exception itself knows where the user should go — for example, an auth guard that redirects to a login page. The redirect status code is controlled by the exception, so you can use `303 See Other`, `302 Found`, or `301 Moved Permanently` as appropriate.

If `getRedirect()` returns an invalid value (missing `url` or `status`), the filter logs a warning and falls through to default handling. API clients always receive JSON regardless of `getRedirect()`.

### Response Priority

When the request accepts `text/html`, the filter resolves the response using the following priority order. Exception-declared behaviour always takes priority over decorator-declared behaviour:

| Priority | Source | Mechanism |
|----------|--------|-----------|
| 1 | Exception | `getRedirect()` — redirect with `{ status, url }` |
| 2 | Decorator | `@ErrorTemplate` with `/` prefix — redirect to route |
| 3 | Decorator | `@ErrorTemplate` — render a template |
| 4 | Default | JSON response via `getResponse()` |

For non-HTML requests (API clients), the filter always returns JSON.

### Static Template Locals

Pass an optional second argument to `@ErrorTemplate` to provide static, per-route variables to the template. These are available under `errorTemplateLocals`:

```typescript
@ErrorTemplate('auth/magic-link', {
  formAction: '/auth/magic-link',
  pageTitle: 'Sign In',
})
@Post('magic-link')
public sendMagicLink(@Body() dto: SendMagicLinkDto) {}
```

In your template:

```ejs
<h1><%= errorTemplateLocals.pageTitle %></h1>
<form action="<%= errorTemplateLocals.formAction %>">
  <p><%= exception.message %></p>
</form>
```

Static locals are namespaced under `errorTemplateLocals` to avoid overwriting request-scoped values set by middleware (e.g. i18n, auth state). For request-scoped template variables, use middleware to set `res.locals` directly.

## Logging

### Logger Selection

The exception filter selects a logger in the following priority order:

1. **Request logger (`req.logger`)** - If the request has a `logger` property, it will be used. This enables request-scoped logging with correlation IDs and request context.
2. **Overridden NestJS Logger** - If `Logger.overrideLogger()` was called with a custom implementation, that logger is used.
3. **Default NestJS Logger** - Falls back to the built-in ConsoleLogger.

### Using Request-Scoped Loggers

For the best logging experience, attach a logger to each request via middleware:

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Attach a request-scoped logger with correlation ID
    req['logger'] = createLogger({
      correlationId: req.headers['x-correlation-id'] || uuid(),
      method: req.method,
      url: req.url,
    })
    next()
  }
}
```

When a `req.logger` is available, all exception logs will include request context automatically.

### Recommended: @neomaventures/logger

This package works best with [@neomaventures/logger](https://github.com/neomaventures/pack/tree/main/packages/logging) for rich, structured error logging with full request context and production-grade features.

```typescript
import { Module } from '@nestjs/common'
import { LoggerModule } from '@neomaventures/logger'
import { ExceptionHandlerModule } from '@neomaventures/exceptions'

@Module({
  imports: [
    LoggerModule.forRoot(),
    ExceptionHandlerModule.forRoot({}),
  ],
})
export class AppModule {}
```

### Built-in NestJS Logger

Works with NestJS's built-in Logger out of the box. When using the default ConsoleLogger, logs are formatted as:

```typescript
Logger.error(err, message, 'NeomaExceptionFilter')
```

### Custom Loggers

Compatible with any logger implementing NestJS's `LoggerService` interface. For structured loggers (Pino, Winston, Bunyan), logs are formatted as:

```typescript
logger.error(message, { err })
```

This provides clean structured output with the full error object for better log aggregation and searching.

## API Reference

### `ExceptionHandlerModule`

A NestJS module that registers a global exception filter, validation pipe, and error template metadata bridge guard.

```typescript
import { ExceptionHandlerModule } from '@neomaventures/exceptions'

@Module({
  imports: [ExceptionHandlerModule.forRoot({})],
})
export class AppModule {}
```

**Zero configuration needed** — `forRoot({})` works out of the box with sensible defaults. Pass `{ errorTemplates }` to opt into global HTML fallback templates (see [Global error templates](#global-error-templates)).

Registers:
- `NeomaExceptionFilter` as a global `APP_FILTER`
- `ValidationPipe` with `validationFactory` as a global `APP_PIPE`
- An internal `APP_GUARD` that bridges `@ErrorTemplate` metadata onto `res.locals` (see [Module import order](#module-import-order))

### `NeomaExceptionFilter`

The global exception filter (automatically registered by `ExceptionHandlerModule`).

You typically don't interact with this directly, but you can import it for testing:

```typescript
import { NeomaExceptionFilter } from '@neomaventures/exceptions'

// In tests
const filter = new NeomaExceptionFilter()
```

### `@ErrorTemplate(template, locals?)`

Route decorator that enables HTML error rendering via content negotiation. Accepts a string or an `ErrorTemplateOptions` object, with an optional second argument for static template locals.

```typescript
import { ErrorTemplate } from '@neomaventures/exceptions'

// Single template for all errors on this route
@ErrorTemplate('auth/login')
@Post('login')
public login(@Body() dto: LoginDto) {}

// Per-exception-type templates (default is required)
@ErrorTemplate({
  BadRequestException: 'auth/login',
  NotFoundException: 'errors/not-found',
  default: 'errors/500',
})
@Post('checkout')
public checkout(@Body() dto: CheckoutDto) {}

// Template with static locals
@ErrorTemplate('auth/magic-link', {
  formAction: '/auth/magic-link',
  pageTitle: 'Sign In',
})
@Post('magic-link')
public sendMagicLink(@Body() dto: SendMagicLinkDto) {}
```

When a string is passed, it is normalised to `{ default: template }` internally. The filter resolves the template by matching `err.name` against the keys, falling back to `default`. Values starting with `/` trigger a `303 See Other` redirect instead of rendering. API clients receive JSON as usual.

Static locals are available in templates under `errorTemplateLocals` (e.g. `errorTemplateLocals.formAction`).

### `validationFactory`

Exception factory for `ValidationPipe` that transforms validation errors into a field-keyed object. Automatically registered by `ExceptionHandlerModule`.

Can be imported for use with custom validation pipe configurations:

```typescript
import { validationFactory } from '@neomaventures/exceptions'
```

### `NeomaException`

Interface for custom exceptions with full control over behavior. All methods are optional:

```typescript
import { LoggerService } from '@nestjs/common'
import { NeomaException } from '@neomaventures/exceptions'

export class MyException extends Error implements NeomaException {
  // Optional: HTTP status code (default: 500)
  getStatus?(): number

  // Optional: JSON response body (default: generic 500 response)
  getResponse?(): object

  // Optional: Custom logging (default: status-code-based logging)
  log?(logger: LoggerService): void

  // Optional: Redirect instruction for browser requests (default: no redirect)
  getRedirect?(): { status: number; url: string }
}
```

See [Custom Exceptions with `NeomaException`](#custom-exceptions-with-neomaexception) for detailed examples.

## Advanced Usage

### Testing Exception Handling

```typescript
import { Test } from '@nestjs/testing'
import { ExceptionHandlerModule } from '@neomaventures/exceptions'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'

describe('Exception Handling', () => {
  let app: INestApplication

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ExceptionHandlerModule.forRoot({}), YourModule],
    }).compile()

    app = module.createNestApplication()
    await app.init()
  })

  it('should return 404 for not found', () => {
    return request(app.getHttpServer())
      .get('/users/999')
      .expect(404)
      .expect({
        statusCode: 404,
        message: 'User not found',
        error: 'Not Found',
      })
  })
})
```

### Custom Exception Classes

Works seamlessly with custom exceptions that extend `HttpException`:

```typescript
import { HttpException, HttpStatus } from '@nestjs/common'

export class UserNotVerifiedException extends HttpException {
  constructor() {
    super('User email not verified', HttpStatus.FORBIDDEN)
  }
}

// In your controller
@Post('login')
async login(@Body() credentials: LoginDto) {
  const user = await this.users.findByEmail(credentials.email)

  if (!user.emailVerified) {
    // Logged at WARN level (403 is 4xx)
    throw new UserNotVerifiedException()
  }

  return this.auth.login(user)
}
```

### Custom Exceptions with `NeomaException`

Implement the `NeomaException` interface for full control over status, response, and logging. All methods are optional - unimplemented methods use Neoma defaults:

| Method | Static fallback | Default |
|--------|----------------|---------|
| `getStatus()` | — | 500 Internal Server Error |
| `getResponse()` | — | Generic 500 JSON response |
| `log()` | — | Status-based logging (DEBUG/WARN/ERROR) |
| `getRedirect()` | `@ErrorTemplate` `/` prefix | No redirect |

```typescript
import { LoggerService } from '@nestjs/common'
import { NeomaException } from '@neomaventures/exceptions'

export class PaymentFailedException extends Error implements NeomaException {
  constructor(
    private readonly transactionId: string,
    private readonly reason: string,
  ) {
    super(`Payment failed: ${reason}`)
    this.name = 'PaymentFailedException'
  }

  public getStatus(): number {
    return 402
  }

  public getResponse(): object {
    return {
      statusCode: 402,
      message: this.reason,
      error: 'Payment Required',
    }
  }

  public log(logger: LoggerService): void {
    // Custom logging with transaction context
    logger.error?.('Payment failed', {
      transactionId: this.transactionId,
      reason: this.reason,
    })
  }
}
```

### Disabling Logging for an Exception

Implement an empty `log()` method to disable logging entirely for that exception:

```typescript
export class ExpectedValidationException extends Error implements NeomaException {
  public getStatus(): number {
    return 422
  }

  public getResponse(): object {
    return {
      statusCode: 422,
      message: this.message,
      error: 'Validation Error',
    }
  }

  // Empty implementation disables logging
  public log(): void {}
}
```

### Duck-Typed Exceptions

You don't need to explicitly implement `NeomaException` - the filter uses duck-typing. Any exception with `getStatus()`, `getResponse()`, or `log()` methods will have those methods called.

Exceptions without these methods are automatically treated as 500 Internal Server Error with default logging.

## License

MIT

## Links

- [npm package](https://www.npmjs.com/package/@neomaventures/exceptions)
- [GitHub repository](https://github.com/neomaventures/pack/tree/main/packages/exceptions)
- [Issue tracker](https://github.com/neomaventures/pack/issues)
- [Neoma ecosystem](https://github.com/neomaventures)

## Part of the Neoma Ecosystem

This package is part of the Neoma ecosystem of Laravel-inspired NestJS packages:

- [@neomaventures/config](https://github.com/neomaventures/pack/tree/main/packages/config) - Type-safe environment configuration
- [@neomaventures/logger](https://github.com/neomaventures/pack/tree/main/packages/logging) - Request and application logging
- **@neomaventures/exceptions** - Global exception handling (you are here)
- More coming soon...

Each package works independently but integrates seamlessly for a complete Laravel-like experience in NestJS.
