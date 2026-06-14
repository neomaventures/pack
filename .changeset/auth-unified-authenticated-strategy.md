---
"@neomaventures/auth": minor
---

Unified `@Authenticated()` strategy: per-route `onUnauthenticated` + `AuthModule.forRoot({ onUnauthenticated: ... })` default with class-decorator factory.

BREAKING: `Authenticated` is now a decorator factory, not a guard class. Migration: `@UseGuards(new Authenticated("/x"))` → `@Authenticated({ onUnauthenticated: "/x" })`. `@UseGuards(new Authenticated())` → `@Authenticated()`.
