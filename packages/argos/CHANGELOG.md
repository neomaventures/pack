# Changelog

## 0.1.1

### Patch Changes

- d730a66: Harden actor resolution so the ALS store always holds a `string`. `ArgosModule.forRoot({ defaultActor: undefined })` no longer clobbers the built-in `"system"` default — the default is applied after merging raw options — and `ActorMiddleware` falls back to `"system"` as a final guard instead of asserting a non-null `defaultActor`.

## 0.1.0 - 2026-05-01

### Added

- `ArgosModule` with `forRoot` / `forRootAsync` via `ConfigurableModuleBuilder`
- `@CreatedBy()` column decorator — sets actor on insert, never overwritten
- `@UpdatedBy()` column decorator — sets actor on insert and update
- ALS middleware with pluggable `resolveActor` function
- Configurable `defaultActor` option (defaults to `"system"`)
