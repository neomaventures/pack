---
"@neomaventures/request-context": minor
---

Add `createContextSlot<T>(key)` factory for building typed, per-request ALS slots. Returns five forms: `get`/`set` accessors, a `param` decorator, a DI injection `token`, and a `provider` with a per-request proxy. Consumer packages use this to define their own context concerns (principal, tenant, actor, etc.) without coupling to nestjs-cls internals. Refactors `getRequest()`/`setRequest()` to use `createContextSlot` internally.
