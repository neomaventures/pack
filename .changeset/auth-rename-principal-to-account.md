---
"@neomaventures/auth": minor
---

**BREAKING**: Rename `Principal` to `Account` throughout the public API. `getPrincipal()` is now `getAccount()`, `@Principal()` is now `@CurrentAccount()` (verbose to avoid colliding with the `Account` entity class at the call site), `CurrentPrincipal` injection token is now `CurrentAccountToken`, and `Request.principal` is now `Request.account`. The "principal" abstraction was a holdover from when auth had a generic identity interface; now that `Account` is the concrete entity, all references use account naming.
