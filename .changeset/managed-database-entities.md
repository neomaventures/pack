---
"@neoma/managed-database": minor
---

`managedDatasourceInstance` now accepts the entities to register — an array of globs or entity classes — defaulting to the `src` `.entity.ts` glob. This lets packages whose entities don't live under `src/` (e.g. an e2e harness in `e2e/app`) point the in-memory datasource at the right location. Instances are cached per entities config and torn down after each test, mirroring `@neoma/managed-app`'s instance cache.

**Breaking:** `managedDatasourceInstance()` is now async (returns `Promise<DataSource>`, was a synchronous getter) — `await` it.
