---
"@neomaventures/fixtures": minor
---

**BREAKING**: `MockLoggerService` now implements the `Logger` interface from `@neomaventures/logging` instead of Nest's `LoggerService`. The available jest mock methods are now `trace`, `debug`, `info`, `warn`, `error`, `fatal` — `log`, `verbose`, and `setLogLevels` have been removed. Consumers asserting on `.log(...)` or `.verbose(...)` should switch to `.info(...)` and `.trace(...)` respectively.
