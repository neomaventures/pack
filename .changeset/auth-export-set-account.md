---
"@neomaventures/auth": minor
---

Expose `setAccount` and `runInAuthContext` from `@neomaventures/auth/testing`.

`setAccount` is the write half of the request-scoped account slot. In production the slot is populated by auth's own authentication middleware — consumer code never writes to it directly. The only external need for `setAccount` is in unit specs that seed the slot before calling code under test.

`runInAuthContext(account, fn)` is the layered convenience: it opens a `nestjs-cls` request context AND seeds the account slot in one call, so auth-touching specs never reach for `nestjs-cls` directly. Encapsulates the CLS boundary behind auth's testing surface.

Both ship from `@neomaventures/auth/testing` alongside the entity factories, matching the `/entities` + `/testing` convention already in place and keeping the main barrel free of test-only surface.
