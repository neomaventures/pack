---
"@neomaventures/logging": minor
---

Add namespaced loggers, `LoggingModule.forFeature`, `LoggerFactory`, `@InjectLogger`, and `getLoggerToken`. Renames `ApplicationLoggerService` → `ApplicationLogger`; `LoggingConfiguration` → `LoggingModuleOptions`; level vocabulary moves to pino-native names (`trace | debug | info | warn | error | fatal`). `LOGGING_MODULE_OPTIONS` becomes internal.
