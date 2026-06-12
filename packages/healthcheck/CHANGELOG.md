# @neomaventures/healthcheck

## 0.2.0

### Minor Changes

- f388a2f: Refactor `@HealthCheck()` to attach the probe result to the request rather than short-circuiting the controller method, and add a new `@HealthStatus()` parameter decorator that extracts it. This makes the controller a thin pass-through and unlocks HTML render routes (the `@Render` decorator now gets to run).
  - `@HealthStatus()` — new parameter decorator that returns the `HealthResult` for the current request. Throws if applied without `@HealthCheck()`.
  - `HealthcheckInterceptor` — no longer returns the result as the response body; instead awaits the probe, sets HTTP status (200/503), attaches the result to the request under `HEALTHCHECK_REQUEST_KEY`, and calls `next.handle()`.
  - `HealthService.check()` and `HealthResult` — gain `checkedAt: string` (ISO timestamp). The service owns the timestamp so it's consistent across JSON and HTML renderings.
  - Idiomatic JSON controller becomes `@HealthCheck() public health(@HealthStatus() status: HealthResult): HealthResult { return status }` — the old empty-body shape no longer works because the interceptor doesn't replace the body.
  - See README for the new HTML render example.

  Breaking for consumers using `@HealthCheck()` on an empty-body controller method (the body is now whatever the method returns). Pre-1.0 minor bump under repo convention.

## 0.1.0

### Minor Changes

- 7b82a2a: Initial release. Ships `HealthcheckModule.forRoot()`, `HealthService`, and the `@HealthCheck()` decorator for marking a route as a health endpoint. Auto-detects a TypeORM `DataSource` in DI and runs a `SELECT 1` connectivity probe; the response includes `database: "ok" | "error"` only when a `DataSource` is registered. Returns HTTP 503 when any probe errors, 200 otherwise.
