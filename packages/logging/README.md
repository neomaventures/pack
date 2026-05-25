# @neoma/logging

High-performance, production-ready logging for NestJS applications powered by Pino. Provides excellent developer experience with request-scoped loggers, field redaction, and seamless NestJS integration.

## Why @neoma/logging?

- 🚀 **Drop-in replacement** for NestJS built-in logger
- 🎯 **Request-scoped logging** with automatic request context
- 🔧 **Global context configuration** for application metadata
- 🔒 **Field redaction** for sensitive data protection
- ⚡ **High performance** with Pino under the hood
- 🛠️ **Excellent DX** with native NestJS patterns
- 📝 **Comprehensive testing** with memory buffer approach

## Installation

```bash
npm install @neoma/logging pino
```

## Basic Usage

### Quick Start

Register `LoggingModule.forRoot()` once in your root module — it's global, so `ApplicationLoggerService` and `RequestLoggerService` are injectable everywhere without re-importing:

```typescript
import { LoggingModule } from '@neoma/logging'
import { Module } from '@nestjs/common'

@Module({
  imports: [LoggingModule.forRoot()]
})
export class AppModule {}
```

### Using the Logger

```typescript
import { Injectable } from '@nestjs/common'
import { ApplicationLoggerService } from '@neoma/logging'

@Injectable()
export class UserService {
  constructor(private readonly logger: ApplicationLoggerService) {}

  createUser(userData: any) {
    this.logger.log('Creating new user', { userId: userData.id })
    
    try {
      // ... user creation logic
      this.logger.log('User created successfully', { userId: userData.id })
    } catch (error) {
      this.logger.error('Failed to create user', { 
        userId: userData.id, 
        error: error.message 
      })
      throw error
    }
  }
}
```

## Configuration

### Log Levels

Configure the minimum log level to capture:

```typescript
LoggingModule.forRoot({
  logLevel: 'warn' // Only log warnings, errors, and fatal messages
})
```

Available levels (from most to least verbose):
- `verbose` (maps to Pino `trace`)
- `debug` - **Enables automatic request/response logging**
- `log` (maps to Pino `info`) - **default**
- `warn`
- `error` 
- `fatal`

### Field Redaction

Protect sensitive data by configuring field redaction:

```typescript
LoggingModule.forRoot({
  logRedact: [
    'password',           // Redact any top-level password field
    'user.ssn',          // Redact nested fields with dot notation
    '*.apiKey',          // Redact apiKey from any object
    'tokens.*.secret',   // Redact secret from any object under tokens
    'medical.*'          // Redact all fields under medical object
  ]
})
```

**Before redaction:**
```typescript
logger.log('User login', {
  username: 'john_doe',
  password: 'secret123',
  profile: {
    email: 'john@example.com',
    apiKey: 'sk-1234567890'
  }
})
```

**After redaction:**
```json
{
  "level": 30,
  "msg": "User login",
  "username": "john_doe",
  "password": "[REDACTED]",
  "profile": {
    "email": "john@example.com", 
    "apiKey": "[REDACTED]"
  }
}
```

### Log Context

Add global context that gets included with every log entry:

```typescript
LoggingModule.forRoot({
  logContext: {
    service: 'user-api',
    version: '1.2.3',
    environment: 'production'
  }
})
```

**Result in logs:**
```json
{
  "level": 30,
  "msg": "User created successfully",
  "service": "user-api",
  "version": "1.2.3", 
  "environment": "production",
  "userId": "123"
}
```

### Automatic Request Logging

When `logLevel: 'debug'`, the module automatically logs all incoming requests and responses:

```typescript
LoggingModule.forRoot({
  logLevel: 'debug' // Enables automatic request/response logging
})
```

**Automatic logs include:**
- Request start: Method, URL, controller, handler
- Request completion: Response status, duration  
- Request errors: Error details and stack traces (when `logErrors: true`)

**Example output:**
```json
{"level":20,"msg":"Processing an incoming request and dispatching it to a route handler.","controller":{"name":"UserController","path":"users"},"handler":{"name":"createUser","path":"/"},"req":{"method":"POST","url":"/users"}}
{"level":20,"msg":"Processed an incoming request that was successfully handled by a route handler.","controller":{"name":"UserController","path":"users"},"handler":{"name":"createUser","path":"/"},"res":{"statusCode":201},"duration":"45ms"}
```

### Error Logging

Control whether intercepted errors are automatically logged:

```typescript
LoggingModule.forRoot({
  logLevel: 'debug',  // Enable request logging
  logErrors: true     // Also log errors caught by interceptor
})
```

### Complete Configuration

```typescript
import { LoggingModule } from '@neoma/logging'

@Module({
  imports: [
    LoggingModule.forRoot({
      logLevel: 'debug',
      logContext: {
        service: 'user-api',
        version: '1.0.0',
        environment: process.env.NODE_ENV
      },
      logRedact: [
        'password',
        '*.secret',
        'user.personalInfo.*',
        'payment.cardNumber'
      ],
      logRequestTraceIdHeader: 'x-correlation-id',
      logErrors: true
    })
  ]
})
export class AppModule {}
```

## API Reference

### ApplicationLoggerService

Application-scoped logger for general application logging. Implements the NestJS `LoggerService` interface:

```typescript
class ApplicationLoggerService {
  // Standard NestJS LoggerService methods
  log(message: any, ...optionalParams: any[]): void
  error(message: any, ...optionalParams: any[]): void  
  warn(message: any, ...optionalParams: any[]): void
  debug?(message: any, ...optionalParams: any[]): void
  verbose?(message: any, ...optionalParams: any[]): void
  fatal?(message: any, ...optionalParams: any[]): void
}
```

**Usage:**
```typescript
@Injectable()
export class UserService {
  constructor(private logger: ApplicationLoggerService) {}
  
  processUsers() {
    this.logger.log('Processing batch of users')
    // Logs: { msg: 'Processing batch of users', service: 'user-api', version: '1.0.0' }
  }
}
```

### RequestLoggerService

Request-scoped logger that automatically includes HTTP request context. Extends `ApplicationLoggerService` with additional request details:

```typescript
@Injectable()
export class UserController {
  constructor(private logger: RequestLoggerService) {}
  
  @Post()
  createUser(@Body() userData: any) {
    this.logger.log('Creating user', { userId: userData.id })
    // Logs: { 
    //   msg: 'Creating user', 
    //   userId: userData.id,
    //   service: 'user-api', 
    //   version: '1.0.0',
    //   req: { method: 'POST', url: '/users', headers: {...} }
    // }
  }
}
```

**Key features:**
- **Request-scoped**: New instance per HTTP request
- **Automatic context**: Includes request method, URL, headers automatically  
- **Request tracing**: Automatic request trace ID generation with ULID
- **Header extraction**: Extract correlation IDs from request headers
- **Context merging**: Combines `logContext` configuration with request details
- **Same interface**: Uses identical logging methods as `ApplicationLoggerService`
- **Middleware integration**: Automatically available as `req.logger` in routes/middleware

### Request Tracing

Every request automatically gets a unique trace ID included in all log entries. This enables request correlation across distributed systems:

```typescript
@Controller('users')
export class UserController {
  constructor(private logger: RequestLoggerService) {}
  
  @Post()
  createUser(@Body() userData: any) {
    this.logger.log('Processing user creation')
    this.logger.log('Validating user data') 
    this.logger.log('User created successfully')
    
    // All logs will have the same requestTraceId:
    // { requestTraceId: '01HKQJQM7R8N4X3Z2T1V5B6Y9C', msg: 'Processing user creation' }
    // { requestTraceId: '01HKQJQM7R8N4X3Z2T1V5B6Y9C', msg: 'Validating user data' }
    // { requestTraceId: '01HKQJQM7R8N4X3Z2T1V5B6Y9C', msg: 'User created successfully' }
  }
}
```

#### Custom Correlation Headers

Extract trace IDs from incoming request headers (useful for microservice communication):

```typescript
LoggingModule.forRoot({
  logRequestTraceIdHeader: 'x-correlation-id', // Case-insensitive header lookup
  logContext: {
    service: 'user-api'
  }
})
```

**With header present:**
```bash
curl -H "x-correlation-id: abc123" POST /users
```
```json
{
  "level": 30,
  "msg": "Processing user creation",
  "requestTraceId": "abc123",
  "service": "user-api"
}
```

**With header missing:**
```bash
curl POST /users  
```
```json
{
  "level": 40,
  "msg": "Request Trace Header 'x-correlation-id' not found, auto-generating trace ID: 01HKQJQM7R8N4X3Z2T1V5B6Y9C"
}
{
  "level": 30,
  "msg": "Processing user creation", 
  "requestTraceId": "01HKQJQM7R8N4X3Z2T1V5B6Y9C",
  "service": "user-api"
}
```

**ULID Benefits:**
- **Sortable**: Lexicographically sortable by generation time
- **Compact**: 26 characters vs 36 for UUID  
- **Random**: 80 bits of randomness for uniqueness
- **Readable**: Crockford Base32 encoding (no confusing characters)

### Middleware Integration

The module automatically attaches `RequestLoggerService` to all incoming requests as `req.logger`, making it available in middleware, guards, and route handlers:

```typescript
import { Request, Response, NextFunction } from 'express'

// In middleware
export function customMiddleware(req: Request, res: Response, next: NextFunction) {
  req.logger.log('Custom middleware executed', { path: req.path })
  next()
}

// In route handlers (alternative to injection)
@Controller('users')
export class UserController {
  @Get(':id')
  getUser(@Req() req: Request, @Param('id') id: string) {
    req.logger.log('Fetching user', { userId: id })
    // This logger includes request context automatically
  }
}

### Usage Patterns

**Simple message:**
```typescript
logger.log('User logged in')
```

**Message with context object:**
```typescript
logger.log('User logged in', { 
  userId: '123', 
  email: 'user@example.com' 
})
```

**Message with printf-style interpolation:**
```typescript
logger.log('Processing payment for user %s: %d %s', userId, amount, currency)
// Results in: { msg: 'Processing payment for user john: 100 USD' }
```

### LoggingConfiguration

```typescript
interface LoggingConfiguration {
  /**
   * Minimum log level to capture. Setting to 'debug' enables automatic request logging.
   * @default 'log'
   */
  logLevel?: 'verbose' | 'debug' | 'log' | 'warn' | 'error' | 'fatal'
  
  /**
   * Custom destination for log output (mainly for testing)
   * @default process.stdout
   */
  logDestination?: any
  
  /**
   * Fields to redact from logs for privacy/security
   * @default []
   */
  logRedact?: string[]
  
  /**
   * Global context to include with every log entry
   * @default {}
   */
  logContext?: any
  
  /**
   * Optional header name to extract trace ID from incoming requests
   * Performs case-insensitive lookup and auto-generates ULID if missing
   * @default null
   */
  logRequestTraceIdHeader?: string
  
  /**
   * Whether to log errors caught by the RequestLoggerInterceptor
   * @default false
   */
  logErrors?: boolean
}
```

## Advanced Usage

### Testing Your Logs

Use ArrayStream for testing log output:

```typescript
import { Test } from '@nestjs/testing'
import { LoggingModule, ApplicationLoggerService } from '@neoma/logging'
import { ArrayStream } from '@neoma/logging/fixtures'

describe('MyService', () => {
  let logger: ApplicationLoggerService
  let logs: any[]

  beforeEach(async () => {
    logs = []
    const module = await Test.createTestingModule({
      imports: [
        LoggingModule.forRoot({
          logDestination: new ArrayStream(logs)
        })
      ]
    }).compile()
    
    logger = module.get(ApplicationLoggerService)
  })

  it('should log user creation', () => {
    logger.log('User created', { userId: '123' })
    
    expect(logs).toContainEqual(
      expect.objectContaining({
        level: 30, // INFO level
        msg: 'User created',
        userId: '123'
      })
    )
  })
})
```


## Performance

@neoma/logging is built on Pino, one of the fastest Node.js loggers:

- **Low overhead**: Minimal performance impact on your application
- **Asynchronous**: Non-blocking log operations
- **Efficient**: Optimized JSON serialization
- **Memory efficient**: Smart object redaction without deep cloning

## Comparison

| Feature | @neoma/logging | NestJS Built-in | nestjs-pino |
|---------|---------------|----------------|-------------|
| Performance | ⚡ High | 🐌 Low | ⚡ High |
| NestJS Integration | 🎯 Native | ✅ Built-in | 🔧 Manual |
| Request Scoping | ✅ Yes | ❌ No | ✅ Yes (AsyncLocalStorage) |
| Global Context | ✅ Built-in | ❌ No | 🔧 Manual |
| Field Redaction | ✅ Built-in | ❌ No | 🔧 Manual |
| Testing DX | ✅ Excellent | ❌ Poor | 🔧 Manual |
| TypeScript Support | ✅ Full | ✅ Full | ✅ Full |

## Features

- ✅ **ApplicationLoggerService** - Application-scoped logging with global context
- ✅ **RequestLoggerService** - Request-scoped logging with automatic request context
- ✅ **Automatic request logging** - Log all requests/responses when `logLevel: 'debug'`
- ✅ **Request tracing** - Automatic ULID generation for request correlation
- ✅ **Header extraction** - Extract trace IDs from request headers with fallback
- ✅ **Error interceptor** - Configurable automatic error logging
- ✅ **Middleware integration** - Logger available as `req.logger` on all requests
- ✅ **Field redaction** - Built-in sensitive data protection with Pino paths
- ✅ **Global context configuration** - Add application metadata to all logs
- ✅ **Memory buffer testing** - ArrayStream utility for comprehensive test coverage
- ✅ **Printf-style and object context** - Flexible logging patterns

## Coming Soon

- 🏷️ **Default log fields** - Automatic environment, version, and deployment metadata
- 📊 **Structured logging helpers** - Common log patterns and utilities  
- 🔄 **Log rotation** - Built-in log file rotation
- 📈 **Metrics integration** - Automatic logging metrics collection

## Requirements

- Node.js >= 14
- NestJS >= 8
- TypeScript >= 4.5

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Links

- [npm package](https://www.npmjs.com/package/@neoma/logging)
- [GitHub repository](https://github.com/shipdventures/neoma-logging)
- [Pino documentation](https://getpino.io/)
- [NestJS documentation](https://docs.nestjs.com/)