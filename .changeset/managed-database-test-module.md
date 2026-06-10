---
"@neomaventures/managed-database": minor
"@neomaventures/storage": patch
---

Add `createTestDbModule(entities)` to `@neomaventures/managed-database` — a `@Global()` NestJS dynamic module that exposes the managed test datasource under `getDataSourceToken()`. Replaces inline `GlobalTestDbModule` boilerplate in `@neomaventures/storage` test setup with a one-line import.
