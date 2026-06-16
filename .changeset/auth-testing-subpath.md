---
"@neomaventures/auth": minor
---

Ship `@neomaventures/auth/testing` subpath export with `fakeAccount()` and `fakeOAuthToken()` builders. Consumers can now seed real `Account` instances (with `activeToken()` etc.) and `OAuthToken` instances in tests without rolling their own factories. `@faker-js/faker` and `@neomaventures/google-fixtures` are optional peer dependencies — only required when importing from `/testing`.
