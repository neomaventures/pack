---
"@neomaventures/logging": minor
---

Add namespaced loggers, `LoggingModule.forFeature`, `LoggerFactory`, `@InjectLogger`, and `getLoggerToken`. Rename `ApplicationLoggerService` to `ApplicationLogger` and `LoggingConfiguration` to `LoggingModuleOptions`. Level vocabulary now maps 1:1 to pino (`trace | debug | info | warn | error | fatal`); the legacy NestJS-style `verbose | log` names are removed. The `LOGGING_MODULE_OPTIONS` symbol is now internal.

`ApplicationLogger` and namespaced loggers have separate level precedence: `defaultLevel` controls the app logger only; namespaced loggers floor at `'error'` and are raised via `forRoot.loggers[ns].level` (app override) or the package's own `forFeature` entry. This prevents raising the app's verbosity from turning every `@neomaventures/*` package into a firehose.
