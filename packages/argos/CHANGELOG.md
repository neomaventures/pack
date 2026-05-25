# Changelog

## 0.1.0 - 2026-05-01

### Added

- `ArgosModule` with `forRoot` / `forRootAsync` via `ConfigurableModuleBuilder`
- `@CreatedBy()` column decorator — sets actor on insert, never overwritten
- `@UpdatedBy()` column decorator — sets actor on insert and update
- ALS middleware with pluggable `resolveActor` function
- Configurable `defaultActor` option (defaults to `"system"`)
