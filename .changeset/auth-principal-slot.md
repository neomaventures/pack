---
"@neomaventures/auth": minor
---

Register principal slot via `@neomaventures/request-context`'s `createContextSlot` kit. Adds `getPrincipal()` accessor, `CurrentPrincipal` injection token, and reimplements `@Principal()` decorator on the ALS-backed slot. Auth middlewares dual-write to both `req.principal` and the slot. Guards read from `getPrincipal()`. `req.principal` is deprecated but continues to work. `@Principal()` now returns `undefined` instead of throwing when no principal exists. `@neomaventures/request-context` is now a peer dependency.
