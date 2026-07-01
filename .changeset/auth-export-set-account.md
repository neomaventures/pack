---
"@neomaventures/auth": minor
---

Expose `setAccount` from `@neomaventures/auth/testing`.

`setAccount` is the write half of the request-scoped account slot. In production the slot is populated by auth's own authentication middleware — consumer code never writes to it directly. The only external need for `setAccount` is in unit specs that mount `RequestContextModule.forRoot()` and seed the slot before calling code under test (the pattern used in auth's own decorator specs). It now ships from `@neomaventures/auth/testing` alongside the entity factories, matching the `/entities` + `/testing` convention already in place and keeping the main barrel free of test-only surface.
