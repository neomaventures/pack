---
"@neomaventures/logging": minor
---

Add namespaced loggers, LoggingModule.forFeature, @InjectLogger. Renames ApplicationLoggerService → ApplicationLogger; LoggingConfiguration → LoggingModuleOptions; level vocabulary moves to pino-native names (`trace|debug|info|warn|error|fatal`). LOGGING_MODULE_OPTIONS becomes internal.

The factory wiring is internal: `LoggerFactory` was replaced by a free `createLogger` function and `getLoggerToken` is no longer exported from the public barrel. Consumers wire namespaced loggers exclusively through `LoggingModule.forFeature` + `@InjectLogger(namespace)`.

Pino's default `pid` and `hostname` base fields are now preserved when a `context` option is supplied (previously they were clobbered).

Adds a new `/testing` sub-path export with `MockLogger` — a test double implementing the `Logger` contract. Import via `@neomaventures/logging/testing`. This is the new home for the mock that previously lived in `@neomaventures/fixtures` as `MockLoggerService`.
