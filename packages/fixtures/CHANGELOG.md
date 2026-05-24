# Changelog

## 0.5.0

### Minor Changes

- 1fff501: **Breaking:** remove the Mailpit surface. `@neoma/fixtures` no longer exports `./mailpit`, `./setup/mailpit`, `./teardown/mailpit`, or the `startMailpit` / `stopMailpit` / `Mailpit*` symbols from `./docker`. Use the standalone [`@neoma/mailpit`](https://github.com/neomaventures/pack/tree/main/packages/mailpit) package instead.

### Patch Changes

- 1fff501: Source the Docker container helpers (`waitForHttp` / `waitForTcp` / `stopContainer` + option types) from the new `@neoma/docker` package instead of a bundled copy. No public API change — `@neoma/fixtures/docker` still re-exports the same helpers.
- Updated dependencies [1fff501]
  - @neoma/docker@0.1.0

## 0.4.0

### Minor Changes

- d5e76e8: **Breaking:** remove the MockServer surface. `@neoma/fixtures` no longer exports `./mockserver`, `./setup/mockserver`, `./teardown/mockserver`, or the `startMockServer` / `stopMockServer` / `MockServer*` symbols from `./docker`. Use the standalone [`@neoma/mockserver`](https://github.com/neomaventures/pack/tree/main/packages/mockserver) package instead.

## 0.3.0

### Minor Changes

- ac5ecb1: Add `multerFile()` — a faker-populated `Express.Multer.File` mock for file-upload tests. Top-level export, re-exported from the package root. (Promoted from `@neoma/cerberus`'s local fixtures.)

### Patch Changes

- ac5ecb1: `startMailpit` now waits for the HTTP API to be ready (not just the SMTP port) before resolving — fixing an `ECONNRESET` race for clients that call the API immediately after startup.

## [0.2.2] - 2026-04-29

### Fixed

- Tightened `executionContext()` route handler type safety — the `method` parameter is now typed as `keyof T & string` instead of `string`, providing compile-time assurance that the method exists on the controller class

## [0.2.1] - 2026-04-29

### Fixed

- Corrected repository URLs from `shipdventures/neoma-fixtures` to `neomaventures/fixtures` in package.json and changelog

## [0.2.0] - 2026-04-29

### Added

- `MockServerClient` — class-based MockServer HTTP client with `reset()`, `createExpectation()`, and `verifyExpectationMatched()` methods
- `@neoma/fixtures/mockserver` — new sub-path export for MockServer client utilities
- `MailpitClient` — class-based Mailpit HTTP client with `clear()`, `messages()`, `message()`, and `findByRecipient()` methods
- `@neoma/fixtures/mailpit` — new sub-path export for Mailpit client utilities
- `startMailpit(options?)` — starts a Mailpit Docker container with SMTP and API ports
- `stopMailpit(options?)` — stops the Mailpit Docker container
- `startMinIO(options?)` — starts a MinIO Docker container, creates a bucket, and sets storage env vars
- `stopMinIO(options?)` — stops the MinIO Docker container
- `startMockServer(options?)` — starts a MockServer Docker container with health-check polling and sets `MOCKSERVER_URL` env var
- `stopMockServer(options?)` — stops the MockServer Docker container using the standard naming convention
- `waitForHttp(url, options?)` — shared health-check utility that polls an HTTP endpoint until 2xx
- `waitForTcp(host, port, options?)` — shared health-check utility that probes a TCP port
- `@neoma/fixtures/setup/mailpit` — Jest `globalSetup` drop-in for Mailpit
- `@neoma/fixtures/setup/minio` — Jest `globalSetup` drop-in for MinIO
- `@neoma/fixtures/setup/mockserver` — Jest `globalSetup` drop-in for MockServer
- `@neoma/fixtures/teardown/mailpit` — Jest `globalTeardown` drop-in for Mailpit
- `@neoma/fixtures/teardown/minio` — Jest `globalTeardown` drop-in for MinIO
- `@neoma/fixtures/teardown/mockserver` — Jest `globalTeardown` drop-in for MockServer
- `@neoma/fixtures/docker` — new sub-path export for Docker container utilities

## [0.1.0] - 2026-04-13

### Added

- `express.request()` — mock Express Request with randomized defaults and case-insensitive header access
- `express.response()` — mock Express Response with `status()`, `json()`, `send()`, `header()`, `getHeader()`, `setHeader()`, `removeHeader()`, `cookie()`, `clearCookie()`, `redirect()`, `render()`, `end()` as Jest mocks
- `express.cookie()` — HMAC-SHA256 signed cookie string matching cookie-parser format
- `executionContext()` — partial NestJS ExecutionContext supporting both bare handler functions and typed route objects
- `MockLoggerService` — implements `LoggerService` with all methods as `jest.fn()`
- `toThrowMatching` / `toMatchError` — custom Jest matchers for error class and property assertions

[Unreleased]: https://github.com/neomaventures/fixtures/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/neomaventures/fixtures/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/neomaventures/fixtures/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/neomaventures/fixtures/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/neomaventures/fixtures/releases/tag/v0.1.0
