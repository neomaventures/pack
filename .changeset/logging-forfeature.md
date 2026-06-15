---
"@neomaventures/logging": minor
---

Add namespaced loggers, LoggingModule.forFeature, LoggerFactory, @InjectLogger, getLoggerToken. Renames ApplicationLoggerService → ApplicationLogger; LoggingConfiguration → LoggingModuleOptions; level vocabulary moves to pino-native names (`trace|debug|info|warn|error|fatal`). LOGGING_MODULE_OPTIONS becomes internal.

Adds a new `/testing` sub-path export with `MockLogger` — a test double implementing the `Logger` contract. Import via `@neomaventures/logging/testing`. This is the new home for the mock that previously lived in `@neomaventures/fixtures` as `MockLoggerService`.
