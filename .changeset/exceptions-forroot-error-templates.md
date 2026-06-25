---
"@neomaventures/exceptions": minor
---

Add `ExceptionHandlerModule.forRoot({ errorTemplates })` — a global error-template fallback rendered when no route-level `@ErrorTemplate` is reachable. Covers middleware-thrown exceptions, the `APP_GUARD`-ordering edge documented previously, and unmatched routes.

Resolution ladder: exception `getRedirect()` → route-level `@ErrorTemplate` → `forRoot` `errorTemplates[status]` → `errorTemplates.default` → JSON. Route-level decoration always wins over global config; exception-declared redirects always win over both.

**Breaking change (pre-1.0):** bare `imports: [ExceptionHandlerModule]` no longer compiles. Replace with `imports: [ExceptionHandlerModule.forRoot({})]` to preserve current behaviour, or pass `errorTemplates` to opt into the new fallback.
