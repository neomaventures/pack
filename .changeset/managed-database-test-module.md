---
"@neomaventures/managed-database": minor
"@neomaventures/storage": patch
---

Add `ManagedDatabaseModule.forRoot(entities)` — a `@Global()` NestJS dynamic test module that exposes the managed test datasource under `getDataSourceToken()`. Replaces inline `GlobalTestDbModule` boilerplate in `@neomaventures/storage` test setup with a one-line import.
