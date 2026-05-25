# @neoma/features

> Feature flag gating for NestJS applications

Gate routes and controllers behind feature flags with a single decorator. Disabled or missing flags return HTTP 404 as if the route does not exist (fail-closed).

## Motivation

Feature flags let you ship code to production behind a toggle. Without a framework-level solution, every controller ends up with manual `if (flag)` checks that are easy to forget and hard to audit. `@neoma/features` moves gating into the framework layer so your controllers stay clean.

## The Problem

**Without this package:**

```typescript
@Controller("bank-statements")
export class BankStatementsController {
  @Post("upload")
  async upload(@Body() dto: UploadDto) {
    if (!this.config.get("FEATURE_UPLOAD_BANK_STATEMENT")) {
      throw new NotFoundException()
    }
    // actual logic...
  }
}
```

Every route needs its own guard logic. Miss one and a half-built feature leaks to production.

## The Solution

**With this package:**

```typescript
@Controller("bank-statements")
export class BankStatementsController {
  @Post("upload")
  @Feature("UPLOAD_BANK_STATEMENT")
  async upload(@Body() dto: UploadDto) {
    // Only reachable when UPLOAD_BANK_STATEMENT is true
  }
}
```

The `@Feature` decorator and a global guard handle gating automatically. No boilerplate, no forgotten checks.

## Installation

```bash
npm install @neoma/features
```

### Peer Dependencies

```bash
npm install @nestjs/common @nestjs/core reflect-metadata rxjs express
```

`@neoma/features` requires `express` as a peer dependency — the per-request resolver receives the express `Request`. Fastify is not supported at this signature.

## Basic Usage

### 1. Import the Module

**Static configuration:**

```typescript
import { Module } from "@nestjs/common"
import { FeaturesModule } from "@neoma/features"

@Module({
  imports: [
    FeaturesModule.forRoot({
      flags: {
        UPLOAD_BANK_STATEMENT: true,
        NEW_DASHBOARD: false,
      },
    }),
  ],
})
export class AppModule {}
```

**Async configuration via DI:**

```typescript
import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { FeaturesModule } from "@neoma/features"

@Module({
  imports: [
    FeaturesModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        flags: {
          UPLOAD_BANK_STATEMENT: config.get("FEATURE_UPLOAD") === "true",
          NEW_DASHBOARD: config.get("FEATURE_DASHBOARD") === "true",
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

The module registers globally by default so you only need to import it once in your root module.

### 2. Decorate Routes

```typescript
import { Controller, Get, Post, Body } from "@nestjs/common"
import { Feature } from "@neoma/features"

@Controller("bank-statements")
export class BankStatementsController {
  @Post("upload")
  @Feature("UPLOAD_BANK_STATEMENT")
  async upload(@Body() dto: UploadDto) {
    // Only reachable when UPLOAD_BANK_STATEMENT is true
    // Returns 404 when the flag is false or missing
  }

  @Get()
  async list() {
    // No @Feature -- always accessible
  }
}
```

### 3. Gate an Entire Controller

Apply `@Feature` at the class level to gate all routes on a controller:

```typescript
import { Controller, Get } from "@nestjs/common"
import { Feature } from "@neoma/features"

@Controller("dashboard")
@Feature("NEW_DASHBOARD")
export class DashboardController {
  @Get()
  index() {
    // Gated behind NEW_DASHBOARD
  }

  @Get("stats")
  @Feature("DASHBOARD_STATS")
  stats() {
    // Handler-level @Feature overrides the controller-level flag.
    // This route checks DASHBOARD_STATS, not NEW_DASHBOARD.
  }
}
```

When both the controller and a handler have `@Feature`, the handler-level flag takes priority (most specific wins).

### 4. Compute Flags Per Request

Static `flags` are the same for every request. For flags that vary per user, tenant, or request context, provide a `resolve` function. The guard invokes it on every gated request and unions the result with the static `flags` map.

```typescript
FeaturesModule.forRoot({
  flags: { CHECKOUT_V2: true },
  resolve: (req) => req.user?.features ?? {},
})
```

Resolvers can be async and can pull from any service via `forRootAsync`:

```typescript
FeaturesModule.forRootAsync({
  imports: [UsersModule],
  inject: [UserService],
  useFactory: (users: UserService) => ({
    flags: { CHECKOUT_V2: true },
    resolve: async (req) => users.featuresFor(req.user.id),
  }),
})
```

**Union semantics.** A request is admitted for `@Feature(name)` when:

```
flags[name] === true || (await resolve(req))[name] === true
```

**Static wins.** A resolver returning `{ name: false }` does NOT override a static `flags[name] === true`. Use static flags for hard on/off; use the resolver to grant additional access per request.

**When to use which.** Reach for static `flags` when a feature is on or off for everyone (env-driven rollout, kill switch). Reach for `resolve` when availability depends on the request itself (user entitlements, tenant plans, A/B cohort).

### 5. Customising the Deny Response

By default, a denied request returns `HTTP 404` via `NotFoundException`. For some routes a 404 is the wrong signal — you may want `403 Forbidden`, `409 Conflict`, or a custom payload that tells the caller *why* the route is unavailable. Supply an `onDeny` factory on the decorator to control what is thrown on the deny path:

```typescript
import { Controller, ForbiddenException, Post } from "@nestjs/common"
import { Feature } from "@neoma/features"

@Controller("checkout")
export class CheckoutController {
  @Post()
  @Feature("CHECKOUT_V2", {
    onDeny: (req) =>
      new ForbiddenException({
        message: "Checkout disabled",
        requestId: req.headers["x-request-id"],
      }),
  })
  async checkout() {
    // Handle the request
  }
}
```

The factory receives the live express `Request` — the same one the resolver would see — so you can read headers, `req.user`, or anything else bound to the current request.

**Admit path is untouched.** `onDeny` is only invoked when the guard denies. A request admitted by either the static `flags` or the `resolve` function never calls `onDeny`.

**Handler-level `@Feature` fully overrides class-level.** When a handler re-declares `@Feature` without options, the class-level `onDeny` is discarded — the handler falls back to the default `NotFoundException`. There is no field-level inheritance; each `@Feature` stands on its own.

**Whatever you return is thrown.** The guard throws the value returned by `onDeny` as-is. Typically that's an `HttpException` subclass (`ForbiddenException`, `UnauthorizedException`, etc.) so Nest's default exception filter formats the response — but you can return any value as long as your exception pipeline can handle it. It's the consumer's responsibility.

### 6. Programmatic Checks Inside a Handler

`@Feature` gates a whole route. Some handlers need to always run but branch internally — for example, *always* accept a document upload, but only compute an AI summary when `DOCUMENT_AI_SUMMARY` is enabled for this request. Inject `FeaturesService` and call `isEnabled(name)`:

```typescript
import { Injectable } from "@nestjs/common"
import { FeaturesService } from "@neoma/features"

@Injectable()
export class DocumentsService {
  constructor(private readonly features: FeaturesService) {}

  async upload(file: Buffer) {
    const doc = await this.store(file)
    if (await this.features.isEnabled("DOCUMENT_AI_SUMMARY")) {
      doc.summary = await this.summarise(file)
    }
    return doc
  }
}
```

`isEnabled` evaluates the exact admit rule the guard evaluates for `@Feature(name)` on the same request (`flags[name] === true || (await resolve(req))[name] === true`). The resolver is invoked on every call — no memoisation. If caching matters, memoise inside your own resolver.

`FeaturesService` is `Scope.REQUEST` — inject it into request-scoped or per-call providers. Do not inject it into a singleton's construction path; DI will either fail or promote the singleton to request scope.

## How It Works

- A global `APP_GUARD` reads `@Feature` metadata from the handler and controller.
- Handler-level metadata is checked first; if absent, controller-level metadata is used.
- The flag name is looked up in the static `flags` record and, if provided, in the result of `resolve(req)`. The request is admitted when either source yields `=== true`.
- If neither source yields `true`, the guard throws `NotFoundException` (HTTP 404).
- Routes without any `@Feature` decorator are always accessible — the resolver is not invoked for ungated routes.

### Fail-Closed Semantics

A flag that is not present in the `flags` record — and not returned as `true` by the resolver — is treated as disabled. You must explicitly set a flag to `true` (statically or via the resolver) to enable a route. This prevents accidentally exposing routes when a flag name is misspelled or forgotten.

## API Reference

### `FeaturesModule`

NestJS module that registers the feature guard globally.

| Method | Description |
|--------|-------------|
| `FeaturesModule.forRoot(options)` | Static configuration with a flags record |
| `FeaturesModule.forRootAsync(options)` | Async configuration via factory, class, or existing provider |

### `FeaturesModuleOptions`

```typescript
interface FeaturesModuleOptions {
  /**
   * Static feature flag map. Missing flags are treated as disabled.
   * Optional — a consumer may configure only `resolve`.
   */
  flags?: Record<string, boolean>

  /**
   * Per-request resolver. Unioned with `flags` under strict `=== true`
   * semantics; a resolver returning `false` does NOT override static `true`.
   */
  resolve?: FeatureResolver
}
```

### `FeatureResolver`

```typescript
type FeatureResolver = (
  req: Request,
) => Record<string, boolean> | Promise<Record<string, boolean>>
```

The `Request` is the express request type (`import type { Request } from "express"`). Import `FeatureResolver` when you need to annotate a `useFactory` return or extract the resolver to its own function:

```typescript
import type { FeatureResolver } from "@neoma/features"

const resolve: FeatureResolver = async (req) => {
  return req.user?.features ?? {}
}
```

### `@Feature(flag: string, options?: FeatureOptions)`

Decorator that marks a controller or route handler as gated behind a feature flag. Can be applied to both classes and methods.

```typescript
// On a method
@Feature("MY_FLAG")
@Get()
myRoute() {}

// On a controller
@Feature("MY_FLAG")
@Controller("my")
class MyController {}

// With a custom deny response
@Feature("MY_FLAG", {
  onDeny: (req) => new ForbiddenException("disabled"),
})
@Get()
myRoute() {}
```

### `FeatureOptions`

```typescript
interface FeatureOptions {
  /**
   * Factory invoked on the deny path to construct the value to throw. When
   * omitted, the guard throws `NotFoundException`.
   */
  onDeny?: FeatureOnDeny
}
```

### `FeatureOnDeny`

```typescript
type FeatureOnDeny = (req: Request) => unknown
```

Invoked only on deny. Receives the live express `Request`. Whatever it returns is thrown by the guard as-is — typically an `HttpException` subclass (e.g. `ForbiddenException`) so Nest's default exception filter formats the response. Any other value works too provided your exception pipeline handles it; that's the consumer's responsibility.

### `FeaturesService`

Request-scoped service for programmatic flag checks from inside a handler or service. Mirrors the guard's admit rule exactly.

```typescript
class FeaturesService {
  isEnabled(name: string): Promise<boolean>
}
```

Inject into request-scoped or per-call providers — not singleton construction paths.

## License

MIT

## Links

- [GitHub repository](https://github.com/shipdventures/neoma-features)
- [Issue tracker](https://github.com/shipdventures/neoma-features/issues)

## Part of the Neoma Ecosystem

This package is part of the Neoma ecosystem of Laravel-inspired NestJS packages:

- [@neoma/config](https://github.com/shipdventures/neoma-config) - Type-safe environment configuration
- [@neoma/logger](https://github.com/shipdventures/neoma-logger) - Request and application logging
- [@neoma/exception-handling](https://github.com/shipdventures/neoma-exception-handling) - Global exception handling
- **@neoma/features** - Feature flag gating (you are here)
- More coming soon...
