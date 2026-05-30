# Changelog

## 0.8.0

### Minor Changes

- 5ddb000: **Breaking:** `ApplicationLoggerService` no longer implements `@nestjs/common`'s `LoggerService` interface. It is **not** the app's main logger — `app.useLogger(applicationLoggerService)` will no longer type-check. Nest's own framework logs stay in Nest's `ConsoleLogger`; this service is the structured logger for application code and the Neoma ecosystem.

  **Breaking:** every log method now has a uniform typed signature: `(message: string, context?: LogContext): void`. Printf-style interpolation is gone. To log an error, pass it in the context as `{ err }` — pino's default serializer extracts `{ type, message, stack }` automatically.

  ```ts
  // Before
  logger.log("User %s logged in", username)
  logger.error("Charge failed", err.stack, "Stripe")

  // After
  logger.log(`User ${username} logged in`) // template literal
  logger.log("User login", { username }) // structured (preferred)
  logger.error("Charge failed", { err }) // err auto-serialised
  ```

  **Added:** static delegates for non-DI code (decorators, utilities). Same signatures as the instance methods:

  ```ts
  ApplicationLoggerService.log("Boot complete")
  ApplicationLoggerService.error("Init failed", { err })
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

## 0.7.0

### Minor Changes

- d7922aa: Removed the `req.logger` middleware pattern. `RequestLoggerService`, `RequestLoggerMiddleware`, and the `Express.Request.logger` type augmentation are gone. `ApplicationLoggerService` is now the only logger and reads the current request from `@neoma/request-context` via `getRequest()`, attaching it as a `req` field on every log entry — no per-request logger instance is constructed any more.

  **Required companion: `@neoma/request-context`.** `ApplicationLoggerService` relies on `getRequest()` returning the live request, which only works if the consumer also installs the request-context boundary:

  ```ts
  imports: [
    RequestContextModule.forRoot(), // required for req to appear on log entries
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

### Patch Changes

- @neoma/request-context@0.1.0

## 0.6.0

### Minor Changes

- 8ae1512: Add `LoggingModule.forRootAsync()` to resolve logging options from DI (e.g. a `ConfigService`), alongside the existing `forRoot()`. Also: the per-request trace id (header-provided or generated) now wins over a static `requestTraceId` in `logContext`, and the unused `LOGGING_MODULE_CONTEXT` export was removed.

### Patch Changes

- 8ae1512: Broaden the `express` peer dependency from `^4` to `>=4`. The middleware uses only the stable `Request`/`Response`/`NextFunction` surface and the package builds and tests cleanly against Express 5, so it now declares support for both Express 4 and 5.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.5.0 - 2026-04-06

### Changed

- **BREAKING: `LoggingModule` must now be registered via `forRoot()`** — a plain `imports: [LoggingModule]` no longer registers any providers. Migrate by replacing `LoggingModule` with `LoggingModule.forRoot()` in your root module.
- **`forRoot()` is now global** — register once in the root module, inject `ApplicationLoggerService` or `RequestLoggerService` anywhere without re-importing.
- **`forRoot()` now exports `RequestLoggerService`** — previously only `ApplicationLoggerService` was exported.

### Fixed

- **`@lib` path aliases in build output** — replaced `@lib/*` tsconfig path aliases with relative imports in library source so compiled JS resolves correctly for consumers.

### Planned

- **Default Log Fields** - Automatic inclusion of common metadata fields
  - Environment detection (`NODE_ENV`, `ENVIRONMENT`, etc.)
  - Application version from package.json
  - Deployment metadata (build timestamp, commit hash)
  - Configurable field mapping and custom defaults
  - Seamless integration with existing logContext functionality

## 0.4.0 - 2024-11-11

### Added

- **Automatic Request Logging** - Comprehensive request/response logging with minimal configuration
  - RequestLoggerInterceptor automatically logs incoming requests and responses when `logLevel: 'debug'`
  - Captures request start with controller/handler metadata and route information
  - Logs successful responses with status codes, duration timing, and response context
  - Configurable error logging via `logErrors` option for intercepted exceptions
  - Clean separation of request lifecycle logging vs error handling

- **Request Middleware Integration** - Seamless logger availability across the application
  - RequestLoggerMiddleware automatically attaches RequestLoggerService to `req.logger`
  - Available in all route handlers, middleware, and guards without dependency injection
  - Request-scoped logger with automatic context and trace ID inclusion
  - Alternative to constructor injection for simpler usage patterns

- **Configurable Error Handling** - Fine-grained control over automatic error logging
  - New `logErrors` configuration option to enable/disable interceptor error logging
  - RxJS-based error handling that doesn't interfere with normal error processing
  - Error logs include full context: duration, request details, and stack traces
  - Maintains clean separation between request logging and error logging concerns

- **Enhanced Architecture** - Improved import system and code organization
  - Dedicated `interfaces/` module for clean LoggingConfiguration separation
  - Consistent `@lib/*` import aliases throughout the codebase for maintainability
  - Barrel exports for cleaner public API surface
  - Eliminated circular dependencies and improved TypeScript path resolution

### Enhanced

- **Comprehensive Documentation** - Complete public API documentation with practical examples
  - Enhanced JSDoc for all services with real-world usage patterns
  - LoggingModule documentation includes middleware and interceptor behavior
  - Detailed examples for both dependency injection and `req.logger` approaches
  - Production vs development configuration examples with best practices

- **Systematic Test Coverage** - Scalable test architecture preventing combinatorial explosion
  - 7 focused test scenarios covering all configuration combinations
  - Isolation testing for each feature (logLevel, logErrors) plus integration testing
  - Prevents exponential growth in test complexity as new features are added
  - Comprehensive request/response logging verification with timing assertions

- **Updated README** - Complete feature documentation with new capabilities
  - Automatic request logging section with example outputs
  - Middleware integration usage patterns and examples
  - Updated configuration interface with all new options and clear defaults
  - Enhanced feature comparison showing automatic logging capabilities

### Technical Details

- Interceptor implementation: RxJS `tap` operator with success/error handlers
- Request timing: `Date.now()` before/after for duration measurement
- Error flow: Errors continue through normal NestJS pipeline while logging occurs
- Middleware registration: Applied to all routes (`"*"`) for universal logger availability
- Context preservation: Request-scoped loggers maintain trace IDs and context throughout request lifecycle

### Configuration

```typescript
// Enable automatic request/response logging
LoggingModule.forRoot({
  logLevel: "debug", // Enables RequestLoggerInterceptor
  logErrors: true, // Also log intercepted errors
  logContext: { service: "api" },
  logRedact: ["password", "*.secret"],
})
```

### Usage Examples

```typescript
// Dependency injection approach
@Controller("users")
export class UserController {
  constructor(private logger: RequestLoggerService) {}

  @Post()
  createUser(@Body() data: CreateUserDto) {
    this.logger.log("Creating user", { userId: data.id })
  }
}

// Middleware approach (no injection needed)
@Controller("users")
export class UserController {
  @Get(":id")
  getUser(@Req() req: Request, @Param("id") id: string) {
    req.logger.log("Fetching user", { userId: id })
  }
}
```

### Automatic Request Logs

```json
{"level":20,"msg":"Processing an incoming request and dispatching it to a route handler.","controller":{"name":"UserController","path":"users"},"handler":{"name":"createUser","path":"/"},"req":{"method":"POST","url":"/users"}}
{"level":20,"msg":"Processed an incoming request that was successfully handled by a route handler.","controller":{"name":"UserController","path":"users"},"handler":{"name":"createUser","path":"/"},"res":{"statusCode":201},"duration":"45ms"}
```

## 0.3.0 - 2024-11-09

### Added

- **Request Trace ID Header Extraction** - Configurable correlation ID extraction from HTTP headers
  - New `logRequestTraceIdHeader` configuration option for specifying header name
  - Case-insensitive header lookup using Express `req.get()` method
  - Automatic ULID generation when configured header is missing
  - Warning log when expected header is not found in request
  - Seamless integration with existing RequestLoggerService functionality

- **ULID Support** - Enhanced request tracing with ULID (Universally Unique Lexicographically Sortable Identifier)
  - Sortable by generation time for better log analysis
  - 26-character compact format (vs 36 for UUID)
  - Crockford Base32 encoding for readability
  - 80 bits of randomness for uniqueness
  - Built-in via `ulid` package dependency

### Enhanced

- **Request Tracing** - Every request now includes automatic trace ID generation
  - `requestTraceId` field included in all RequestLoggerService logs
  - Consistent trace ID across entire request lifecycle
  - Enables request correlation across distributed systems
  - Supports both auto-generated and header-extracted trace IDs

- **Configuration Interface** - Extended LoggingConfiguration with new options
  - JSDoc documentation for `logRequestTraceIdHeader` with examples
  - Clear guidance on header extraction behavior
  - Updated TypeScript interfaces with proper type safety

- **Documentation** - Comprehensive updates for new tracing features
  - Request Tracing section with ULID benefits and examples
  - Custom Correlation Headers configuration examples
  - Header extraction behavior documentation with/without headers
  - Updated API reference and configuration interface docs

### Technical Details

- Header extraction logic: `req.get(headerName) || ulid()`
- Warning condition: `options.logRequestTraceIdHeader && !req.get(headerName)`
- Context merging order: `{ requestTraceId, ...logContext, req }`
- Test coverage for all header extraction scenarios including case-sensitivity

### Examples

```typescript
// Configure header extraction
LoggingModule.forRoot({
  logRequestTraceIdHeader: "x-correlation-id",
  logContext: { service: "user-api" },
})

// With header present
// Request: curl -H "x-correlation-id: abc123" POST /users
// Logs: { requestTraceId: 'abc123', service: 'user-api', ... }

// With header missing
// Request: curl POST /users
// Warning: Request Trace Header 'x-correlation-id' not found, auto-generating trace ID: 01HKQJ...
// Logs: { requestTraceId: '01HKQJ...', service: 'user-api', ... }

// All logs in the same request share the same trace ID
this.logger.log("Processing user creation") // requestTraceId: '01HKQJ...'
this.logger.log("Validating user data") // requestTraceId: '01HKQJ...'
this.logger.log("User created successfully") // requestTraceId: '01HKQJ...'
```

## 0.2.0 - 2024-11-08

### Added

- **RequestLoggerService** - Request-scoped logging with automatic context
  - Extends ApplicationLoggerService with request-specific capabilities
  - Automatically includes HTTP request details (method, URL, headers)
  - Request-scoped: New instance created for each HTTP request
  - Seamless integration with existing ApplicationLoggerService patterns

- **Global Log Context** - Application-wide metadata configuration
  - `logContext` configuration option in `LoggingModule.forRoot()`
  - Automatically included in all log entries for both services
  - Perfect for service name, version, environment metadata
  - Merges with request context in RequestLoggerService

- **Enhanced Architecture** - Clean separation of concerns
  - ApplicationLoggerService: Application-scoped for general logging
  - RequestLoggerService: Request-scoped for HTTP request-specific logging
  - Context merging: Global logContext + request details automatically combined
  - No breaking changes to existing ApplicationLoggerService usage

### Enhanced

- **Comprehensive Documentation** - Complete JSDoc for all public interfaces
  - Full API documentation with usage examples
  - Configuration guidance with defaults clearly documented
  - Updated README with RequestLoggerService examples
  - Clear guidance on when to use each service type

- **Complete Test Coverage** - Extensive testing for new features
  - RequestLoggerService test suite covering all logging patterns
  - Log context configuration testing for both services
  - Memory buffer testing approach for request-scoped scenarios
  - Integration testing with express request mocking

### Technical Details

- Context merging behavior: `{ ...logContext, req }` in RequestLoggerService
- Request-scoped dependency injection with `@Inject(REQUEST)`
- Inheritance pattern: RequestLoggerService extends ApplicationLoggerService
- Backward compatibility: All existing ApplicationLoggerService usage unchanged

### Examples

```typescript
// Global context configuration
LoggingModule.forRoot({
  logContext: {
    service: "user-api",
    version: "1.0.0",
    environment: "production",
  },
})

// ApplicationLoggerService usage (application-scoped)
@Injectable()
export class UserService {
  constructor(private logger: ApplicationLoggerService) {}

  processUsers() {
    this.logger.log("Processing batch")
    // Logs: { msg: 'Processing batch', service: 'user-api', version: '1.0.0' }
  }
}

// RequestLoggerService usage (request-scoped)
@Controller()
export class UserController {
  constructor(private logger: RequestLoggerService) {}

  @Post()
  createUser(@Body() data: any) {
    this.logger.log("Creating user", { userId: data.id })
    // Logs: {
    //   msg: 'Creating user', userId: data.id,
    //   service: 'user-api', version: '1.0.0',
    //   req: { method: 'POST', url: '/users', headers: {...} }
    // }
  }
}
```

## 0.1.0 - 2024-01-07

### Added

- **ApplicationLoggerService** - Drop-in replacement for NestJS built-in logger
  - Implements complete NestJS `LoggerService` interface
  - High-performance logging powered by Pino
  - Support for all log levels: verbose, debug, log, warn, error, fatal
  - Maps NestJS log levels to appropriate Pino levels (verbose→trace, log→info, etc.)

- **Field Redaction** - Built-in sensitive data protection
  - Configure fields to redact via `logRedact` option
  - Support for nested field redaction using dot notation (e.g., `user.password`)
  - Wildcard pattern support (e.g., `*.secret`, `tokens.*.key`)
  - Full object redaction (e.g., `medical.*`)
  - Arrays and complex nested structures supported

- **LoggingModule** - Native NestJS module integration
  - `forRoot()` static method for easy configuration
  - Optional configuration with sensible defaults
  - Seamless dependency injection support

- **Printf-style Interpolation** - Standard Node.js logging behavior
  - Support for template strings with placeholders (e.g., `"User %s logged in"`)
  - Automatic parameter interpolation
  - Object context merging for structured logging
  - Compatible with existing NestJS logger usage patterns

- **Comprehensive Testing Support**
  - `ArrayStream` utility for capturing log output in tests
  - Memory buffer approach for testing without mocking
  - Full test coverage with practical examples
  - Documentation for testing patterns

- **Production-Ready Configuration**
  - Configurable log levels with filtering
  - Custom log destinations (for testing and custom streams)
  - TypeScript support with full type safety
  - ESLint and Prettier configuration included

### Technical Details

- Built on Pino v10.1.0 for maximum performance
- Compatible with NestJS v8+
- TypeScript v4.5+ support
- Node.js v14+ compatibility
- Zero breaking changes from NestJS built-in logger

### Documentation

- Complete README with installation, usage, and configuration examples
- API reference with all methods and interfaces
- Advanced usage patterns including testing and @neoma/config integration
- Performance comparison with other logging solutions
- Migration guide from NestJS built-in logger

### Examples

```typescript
// Basic usage
import { LoggingModule, ApplicationLoggerService } from '@neoma/logging'

@Module({
  imports: [LoggingModule.forRoot({
    logLevel: 'debug',
    logRedact: ['password', '*.secret', 'user.personalInfo.*']
  })]
})

// Structured logging
logger.log('User created', { userId: '123', email: 'user@example.com' })

// Printf-style interpolation
logger.log('Processing payment for %s: %d USD', username, amount)

// Automatic redaction
logger.log('Login attempt', { username: 'john', password: 'secret123' })
// Logs: { msg: 'Login attempt', username: 'john', password: '[REDACTED]' }
```
