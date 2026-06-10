---
"@neomaventures/managed-database": minor
---

Add `ManagedDatabaseModule.forRoot(entities?)` — a `@Global()` NestJS dynamic test module that exposes the managed test datasource under TypeORM's standard `getDataSourceToken()`. Entities are optional; omit to auto-discover every `.entity.ts` under the consumer's `src/`. Shares the per-test cache and `afterEach` teardown of `managedDatasourceInstance`.
