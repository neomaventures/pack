# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.1] - 2026-04-06

### Fixed

- **Strict mode crash during NestJS module init** — NestJS probes providers for
  lifecycle hooks (`onModuleInit`, `onModuleDestroy`, `onApplicationBootstrap`,
  `onApplicationShutdown`, `beforeApplicationShutdown`) via property access,
  which triggered strict mode errors. These properties are now ignored alongside
  `then` and `toJSON`.

## [0.4.0] - 2026-04-06

### Added

- **Global `forRoot()`** — `ConfigModule.forRoot()` now sets `global: true`,
  making `ConfigService` available app-wide without importing `ConfigModule`
  in every child module
- **Case-insensitive env var lookup** — Falls back to lowercase when the
  UPPER key isn't found (e.g. `config.npmPackageVersion` resolves `npm_package_version`).
  UPPER takes precedence when both exist. Uses `??` to preserve empty strings.

### Changed

- Extracted `toEnvKey()` helper inside `ConfigService` to eliminate duplication
  between get/has traps

### Breaking

- **`ConfigModule` must now be registered via `forRoot()`** — the plain
  `@Module({})` decorator no longer provides `ConfigService`.
  Migration: `ConfigModule` → `ConfigModule.forRoot()`

## [0.3.0] - 2025-11-05

### Added

- **Type coercion feature** via `ConfigModule.forRoot({ coerce: true })`
  for automatic primitive conversion
- Smart conversion of environment variable strings to JavaScript primitives:
  - `"true"/"false"` → boolean values
  - Numeric strings → numbers (integers, floats, hex, octal, binary, scientific notation)
  - `"null"/"undefined"/"Infinity"/"NaN"` → respective JavaScript values
- Intelligent edge case handling:
  - Decimal leading zeros preserved as strings (`"007"` → `"007"`)
  - Whitespace trimmed for number conversion (`" 123 "` → `123`)
  - Empty strings preserved (`""` → `""`)
  - Valid decimals converted (`"0.123"` → `0.123`)
- Comprehensive documentation with examples and supported conversion patterns
- Full integration with existing `strict` and `loadEnv` options

### Enhanced

- Extended return types to support `string | boolean | number | undefined | null`
- Updated TypeScript interfaces and JSDoc with coerce examples
- Enhanced README with complete coerce feature documentation

## [0.2.1] - 2025-11-04

### Added

- **'has' trap support** for safe property existence checking using
  `'property' in config` syntax
- Safe existence checking that doesn't trigger strict mode errors
- Documentation and examples for ecosystem package integration patterns

### Enhanced

- Strict mode now supports safe property checking before value access
- Improved ecosystem compatibility for optional configuration integration

## [0.2.0] - 2025-11-04

### Added

- **Strict mode** via `ConfigModule.forRoot({ strict: true })`
  for runtime validation of environment variables
- Throws descriptive errors when accessing undefined environment variables in
  strict mode
- Comprehensive test coverage for strict mode behavior
- Documentation and examples for strict mode usage

### Changed

- Optimized test suite by removing redundant E2E tests in favor of
  comprehensive integration tests
- All tests now use package imports (`@neoma/config`) to validate real package behavior
- Added focused @InjectConfig decorator testing

### Removed

- Removed unimplemented `coerce` option from ConfigOptions type
  (breaking change for TypeScript users)

## [0.1.1] - 2025-11-04

### Added

- Explicit test coverage for snake_case property access (e.g., `config.database_url`)
- Documentation proving universal naming convention support

## [0.1.0] - 2025-11-04

### Added

- Initial release
- `ConfigModule` for NestJS integration with optional `forRoot()` configuration
- `ConfigService` with automatic camelCase to SCREAMING_SNAKE_CASE conversion
- `@InjectConfig()` decorator for dependency injection
- `TypedConfig<T>` type helper for full TypeScript support
- **Environment file loading** via `loadEnv` option with proper precedence order
- Support for multiple naming conventions (camelCase, PascalCase, mixed case)
- Full destructuring support
- Comprehensive documentation and examples
- Support for `.env`, `.env.local`, `.env.{NODE_ENV}`,
  and `.env.{NODE_ENV}.local` files

[Unreleased]: https://github.com/shipdventures/neoma-config/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/shipdventures/neoma-config/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/shipdventures/neoma-config/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/shipdventures/neoma-config/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/shipdventures/neoma-config/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/shipdventures/neoma-config/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/shipdventures/neoma-config/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/shipdventures/neoma-config/releases/tag/v0.1.0
