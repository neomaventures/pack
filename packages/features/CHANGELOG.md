# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-04-19

### Added
- Injectable `FeaturesService` with `isEnabled(name)` for in-handler flag branching. Use it when a handler must always run but a downstream step must be conditional on the flag (e.g. accept an upload but only compute an AI summary when `DOCUMENT_AI_SUMMARY` is enabled for the current request). The service is `Scope.REQUEST`; inject it into request-scoped or per-call providers — not singleton construction paths. `isEnabled` mirrors the `FeatureGuard` admit rule exactly (`flags[name] === true || (await resolve?.(req))?.[name] === true`), re-evaluating the resolver on every call (no memoisation).

### Changed
- `FeatureGuard` now delegates its admit decision to `FeaturesService`. The guard is request-scoped and injects `FeaturesService` directly, so the two always share the same view of the in-flight request and their admit rules can never drift. No observable behaviour change — existing e2e specs pass unchanged.

## [0.3.0] - 2026-04-18

### Added
- `@Feature` now accepts an optional second argument `{ onDeny?: (req) => unknown }`. When the guard denies, the value returned by `onDeny` is thrown in place of the default `NotFoundException` — useful when a 404 is the wrong signal (e.g. a 403 kill-switch for webhook receivers). The factory receives the live express `Request` so consumers can read headers, `req.user`, etc. Whatever is returned is thrown as-is; it is the consumer's responsibility to ensure their exception pipeline handles it (typically by returning an `HttpException` subclass). Exports new `FeatureOptions` and `FeatureOnDeny` types.
- README documentation for the `resolve` option and `FeatureResolver` type — catches the public docs up to the v0.2 resolver API and the v0.3 `Request`-narrowed signature. Both root and package READMEs now cover union semantics, static-wins, per-request resolver examples (including DI-injected services), and the express peer-dep requirement.

### Changed
- **BREAKING:** `FeatureResolver` now receives the express `Request` directly instead of a NestJS `ExecutionContext`. Migration: `(ctx) => { const req = ctx.switchToHttp().getRequest(); ... }` becomes `(req) => { ... }`.
- `express` is now a non-optional peer dependency (mirroring `@neoma/logging`). Fastify-only apps cannot install `@neoma/features` at this signature.

### Removed
- Resolver access to WebSocket / RPC execution contexts. The resolver contract is HTTP-only by design; non-HTTP transports are foreclosed at this signature.

## [0.2.0] - 2026-04-17

### Added
- `FeaturesModule` options now accept an optional `resolve(ctx)` function for per-request feature decisions. Admit rule is pure OR with static `flags`: `flags[name] === true || (await resolve(ctx))?.[name] === true`. Sync and async resolvers both supported.
- `FeaturesModule.forRootAsync` now supports DI-injected services in `useFactory`, enabling per-request resolvers backed by application services (e.g. a user service).
- Public `FeatureResolver` type exported for consumers annotating factory return shapes.

### Changed
- `FeaturesModuleOptions.flags` is now optional. All existing `forRoot({ flags: ... })` callers continue to type-check and behave identically.

## [0.1.0] - 2026-04-13

### Added
- `FeaturesModule.forRoot({ flags: { ... } })` and `forRootAsync` for registering feature flags via `ConfigurableModuleBuilder`
- `@Feature("FLAG_NAME")` decorator to gate route handlers and controllers behind a feature flag
- Internal `FeatureGuard` registered globally via `APP_GUARD` — routes with a disabled or missing flag return HTTP 404
- Handler-level `@Feature` overrides controller-level `@Feature` (most specific wins)
- Fail-closed semantics — a flag key absent from the record is treated as disabled

[Unreleased]: https://github.com/shipdventures/neoma-features/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/shipdventures/neoma-features/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/shipdventures/neoma-features/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/shipdventures/neoma-features/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/shipdventures/neoma-features/releases/tag/v0.1.0
