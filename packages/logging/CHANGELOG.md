# Changelog

## 0.3.0

### Minor Changes

- 80870a0: `LogLevel` is now a const-object exposing `Trace`, `Debug`, `Info`, `Warn`, `Error`, `Fatal`, and the new `Silent`. Consumers reference levels via importable identifiers (`LogLevel.Debug`) rather than magic strings. The `LogLevel` type still resolves to the string union (now seven values) so existing string-literal call sites continue to typecheck.

  `Silent` suppresses all output at that namespace — pack packages adopting `@neomaventures/logging` declare `level: LogLevel.Silent` in their `forFeature` so they emit nothing unless the consumer explicitly overrides via `forRoot({ loggers: [{ namespace, level }] })`.

  The internal `getLoggerToken` indirection is removed. `@InjectLogger(namespace)` now uses the namespace string directly as the DI token, and `forFeature` registers providers keyed on the namespace. Test-time substitution is now trivial:

  ```ts
  Test.createTestingModule({ providers: [...] })
    .overrideProvider(NAMESPACE)
    .useValue(new MockLogger())
  ```

  No consumer code change needed — `getLoggerToken` was never exported from the barrel. Existing `@InjectLogger(NAMESPACE)` call sites and `LoggingModule.forFeature([{ namespace, level }])` registrations continue to work unchanged.

## 0.2.0

### Minor Changes

- 6f9825f: Add namespaced loggers, LoggingModule.forFeature, @InjectLogger. Renames ApplicationLoggerService → ApplicationLogger; LoggingConfiguration → LoggingModuleOptions; level vocabulary moves to pino-native names (`trace|debug|info|warn|error|fatal`). LOGGING_MODULE_OPTIONS becomes internal.

  The factory wiring is internal: `LoggerFactory` was replaced by a free `createLogger` function and `getLoggerToken` is no longer exported from the public barrel. Consumers wire namespaced loggers exclusively through `LoggingModule.forFeature` + `@InjectLogger(namespace)`.

  Pino's default `pid` and `hostname` base fields are now preserved when a `context` option is supplied (previously they were clobbered).

  Adds a new `/testing` sub-path export with `MockLogger` — a test double implementing the `Logger` contract. Import via `@neomaventures/logging/testing`. This is the new home for the mock that previously lived in `@neomaventures/fixtures` as `MockLoggerService`.

## 0.1.2

## 0.1.1

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
