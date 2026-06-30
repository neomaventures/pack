---
"@neomaventures/auth": minor
---

Expose `setAccount` from the package barrel.

`setAccount` is the write half of the request-scoped account slot and was already documented in the slot's JSDoc, but only `getAccount` was re-exported from `@neomaventures/auth`. Consumers writing unit specs that mount `RequestContextModule.forRoot()` and seed the slot before calling code under test (the pattern used in auth's own decorator specs) had to either reach into `nestjs-cls` directly or import from the slot's internal path. `setAccount` now mirrors `getAccount` at the package boundary so the seed-then-assert spec pattern works against the public API.
