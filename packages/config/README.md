# @neoma/config

Simple, type-safe environment configuration for NestJS applications.

## The Problem

NestJS's built-in ConfigService adds unnecessary complexity:

- Needs schema validation setup for type safety
- Still requires repetitive `get()` calls with magic strings

Even worse than raw `process.env` calls, you end up maintaining configuration boilerplate that grows with every new environment variable.

## The Solution

`@neoma/config` provides a clean, type-safe way to access environment variables through dependency injection:

```typescript
// Before: Repetitive, untyped, error-prone
class DatabaseService {
  connect() {
    const host = process.env.DATABASE_HOST
    const port = process.env.DATABASE_PORT
    const user = process.env.DATABASE_USER
    // No type checking, no autocomplete
  }
}

// After: Clean, typed, injected
class DatabaseService {
  constructor(
    @InjectConfig()
    private config: TypedConfig<{
      databaseHost: string
      databasePort: string
      databaseUser: string
    }>,
  ) {}

  connect() {
    const { databaseHost, databasePort, databaseUser } = this.config
    // Full type safety and autocomplete!
  }
}
```

## Installation

```bash
npm install @neoma/config
```

## Basic Usage

### 1. Register the ConfigModule

```typescript
import { Module } from "@nestjs/common"
import { ConfigModule } from "@neoma/config"

@Module({
  imports: [ConfigModule.forRoot()],
})
export class AppModule {}
```

`forRoot()` registers globally — `ConfigService` is available in all modules without additional imports.

### 2. Load environment variables (optional)

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@neoma/config'

@Module({
  imports: [
    // Load .env files automatically  
    ConfigModule.forRoot({ loadEnv: true })
  ],
})
export class AppModule {}
```

This automatically loads environment variables from:
- `.env.{NODE_ENV}.local` (highest priority)
- `.env.local` 
- `.env.{NODE_ENV}`
- `.env` (lowest priority)

### 3. Inject and use configuration

```typescript
import { Injectable } from "@nestjs/common"
import { InjectConfig, TypedConfig } from "@neoma/config"

@Injectable()
export class AppService {
  constructor(
    @InjectConfig()
    private config: TypedConfig<{
      apiKey: string
      apiUrl: string
      debugMode: string
    }>,
  ) {}

  makeRequest() {
    // Access environment variables with type safety
    const url = this.config.apiUrl // reads from API_URL
    const key = this.config.apiKey // reads from API_KEY
    const debug = this.config.debugMode // reads from DEBUG_MODE
  }
}
```

## Naming Convention Flexibility

The package automatically converts between camelCase/PascalCase and SCREAMING_SNAKE_CASE, supporting multiple coding styles:

```typescript
// All of these work with DATABASE_URL environment variable:
config.databaseUrl // camelCase (JavaScript convention)
config.databaseURL // Mixed case (common for acronyms)
config.database_url // Snake case (if you prefer)

// Complex examples:
config.apiKey // API_KEY
config.apiURL // API_URL
config.awsS3Bucket // AWS_S3_BUCKET
config.awsS3BucketName // AWS_S3_BUCKET_NAME
```

## Type Safety

Define your configuration interface for full TypeScript support:

```typescript
interface AppConfig {
  // Required configuration
  databaseUrl: string
  redisHost: string
  jwtSecret: string

  // Optional configuration
  port?: string
  logLevel?: string
}

@Injectable()
export class AppService {
  constructor(
    @InjectConfig()
    private config: TypedConfig<AppConfig>,
  ) {}

  connect() {
    // TypeScript knows these are strings
    const dbUrl = this.config.databaseUrl
    const redis = this.config.redisHost

    // TypeScript knows these might be undefined
    const port = this.config.port || "3000"
  }
}
```

## How It Works

Under the hood, `@neoma/config` uses a Proxy to intercept property access and automatically:

1. Convert property names from camelCase to SCREAMING_SNAKE_CASE
2. Look up the corresponding environment variable
3. Return the value with proper typing

This means zero configuration, zero boilerplate, and full type safety.

## Environment File Loading

Enable automatic `.env` file loading with the `loadEnv` option:

```typescript
ConfigModule.forRoot({ loadEnv: true })
```

### File Loading Priority (highest to lowest):
1. **Existing `process.env` variables** (from Docker, Kubernetes, shell, etc.) - **Always wins**
2. `.env.{NODE_ENV}.local` - Environment-specific local overrides  
3. `.env.local` - Local overrides for all environments
4. `.env.{NODE_ENV}` - Environment-specific configuration
5. `.env` - Default configuration

### Example:
```bash
# If DATABASE_URL is already set in process.env, it beats everything
export DATABASE_URL=postgres://from-environment/myapp  # This always wins

# .env
DATABASE_URL=postgres://localhost/myapp
PORT=3000

# .env.local  
DATABASE_URL=postgres://localhost/myapp_local  # This wins over .env (but loses to process.env)

# .env.production
DATABASE_URL=postgres://prod-server/myapp

# .env.production.local
DATABASE_URL=postgres://localhost/myapp_prod_local  # This wins over other files when NODE_ENV=production
```

**Important:** Variables already set in `process.env` (from your deployment environment, Docker, shell exports, etc.) always take precedence over any `.env` file values.

## Strict Mode

Enable strict mode to throw errors when accessing undefined environment variables:

```typescript
ConfigModule.forRoot({ strict: true })
```

This helps catch configuration errors early rather than silently returning `undefined`.

### Example:

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@neoma/config'

@Module({
  imports: [
    // Enable strict mode
    ConfigModule.forRoot({ strict: true })
  ],
})
export class AppModule {}

// In your service:
@Injectable()
export class PaymentService {
  constructor(
    @InjectConfig()
    private config: TypedConfig<{ 
      stripeApiKey: string
      webhookSecret: string 
    }>
  ) {}

  processPayment() {
    // With strict mode: Throws error if STRIPE_API_KEY is not set
    const key = this.config.stripeApiKey
    // Error: "Strict mode error when accessing configuration property 'stripeApiKey'. STRIPE_API_KEY is not defined on process.env"
    
    // Without strict mode: Returns undefined silently
    const key = this.config.stripeApiKey  // undefined
  }
}
```

### Safe Property Access in Strict Mode

When using strict mode, you can safely check if a property exists before accessing it using the `in` operator:

```typescript
@Injectable()
export class FlexibleService {
  constructor(
    @InjectConfig()
    private config: TypedConfig<{ 
      requiredApiKey: string
      optionalFeatureFlag?: string 
    }>
  ) {}

  initialize() {
    // Safe existence check - won't throw in strict mode
    if ('optionalFeatureFlag' in this.config) {
      // Only access if it exists
      const flag = this.config.optionalFeatureFlag
      console.log('Feature flag enabled:', flag)
    }
    
    // Always access required properties directly
    const apiKey = this.config.requiredApiKey // Throws if not set
  }
}
```

This pattern is especially useful for ecosystem packages that need to optionally integrate with other configuration while maintaining strict mode compatibility.

## Type Coercion

Enable automatic type conversion from environment variable strings to JavaScript primitives:

```typescript
ConfigModule.forRoot({ coerce: true })
```

With coercion enabled, string values are automatically converted to their appropriate types:

### Supported Conversions:

**Booleans:**
```bash
FEATURE_ENABLED=true    # → true (boolean)
DEBUG_MODE=false        # → false (boolean)
```

**Numbers:**
```bash
PORT=3000              # → 3000 (number)
TIMEOUT=1.5            # → 1.5 (number)
WORKERS=0x10           # → 16 (hex)
MEMORY=1e6             # → 1000000 (scientific)
```

**Special Values:**
```bash
CACHE_TTL=null         # → null
DEFAULT_VALUE=undefined # → undefined
MAX_RETRIES=Infinity   # → Infinity
INVALID_CONFIG=NaN     # → NaN
```

**Preserved as Strings:**
```bash
VERSION=007            # → "007" (leading zero preserved)
SPACING=" 123 "        # → 123 (whitespace trimmed and converted)
EMPTY_VAL=             # → "" (empty string preserved)
API_KEY=sk_test_123    # → "sk_test_123" (non-numeric stays string)
```

### Example Usage:

```typescript
interface ServerConfig {
  port: number          // Coerced from "3000"
  debug: boolean        // Coerced from "true"
  timeout: number       // Coerced from "30"
  apiKey: string        // Stays as string
  workers?: number      // Coerced from "4" or undefined
}

@Module({
  imports: [ConfigModule.forRoot({ coerce: true })]
})
export class AppModule {}

@Injectable()
export class ServerService {
  constructor(
    @InjectConfig()
    private config: TypedConfig<ServerConfig>
  ) {}

  start() {
    const port = this.config.port      // number: 3000
    const debug = this.config.debug    // boolean: true
    const timeout = this.config.timeout // number: 30
    
    // Type-safe operations
    if (debug) console.log(`Starting on port ${port}`)
    setTimeout(() => this.healthCheck(), timeout * 1000)
  }
}
```

### Combining Options:

You can combine all options for a complete configuration solution:

```typescript
ConfigModule.forRoot({ 
  loadEnv: true,   // Load .env files
  strict: true,    // Throw on missing required vars
  coerce: true     // Auto-convert types
})
```

This gives you:
- **Environment file loading** with proper precedence
- **Runtime validation** for required variables  
- **Automatic type conversion** for primitives
- **Type safety** with TypeScript interfaces

## API Reference

### `ConfigModule`

NestJS module that provides the ConfigService.

### `ConfigService<T>`

Injectable service that provides typed access to environment variables.

### `TypedConfig<T>`

Type helper that combines ConfigService with your configuration interface.

### `@InjectConfig()`

Decorator for injecting the ConfigService into your services and controllers.

## Links

- [GitHub Repository](https://github.com/shipdventures/neoma-config)
- [NPM Package](https://www.npmjs.com/package/@neoma/config)
- [Neoma Ecosystem](https://github.com/shipdventures/neoma)

## License

MIT

