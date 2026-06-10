---
"@neomaventures/healthcheck": minor
---

Initial release. Ships `HealthcheckModule.forRoot()`, `HealthService`, and the `@HealthCheck()` decorator for marking a route as a health endpoint. Auto-detects a TypeORM `DataSource` in DI and runs a `SELECT 1` connectivity probe; the response includes `database: "ok" | "error"` only when a `DataSource` is registered. Returns HTTP 503 when any probe errors, 200 otherwise.
