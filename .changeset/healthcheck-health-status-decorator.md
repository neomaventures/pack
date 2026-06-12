---
"@neomaventures/healthcheck": minor
---

Refactor `@HealthCheck()` to attach the probe result to the request rather than short-circuiting the controller method, and add a new `@HealthStatus()` parameter decorator that extracts it. This makes the controller a thin pass-through and unlocks HTML render routes (the `@Render` decorator now gets to run).

- `@HealthStatus()` — new parameter decorator that returns the `HealthResult` for the current request. Throws if applied without `@HealthCheck()`.
- `HealthcheckInterceptor` — no longer returns the result as the response body; instead awaits the probe, sets HTTP status (200/503), attaches the result to the request under `HEALTHCHECK_REQUEST_KEY`, and calls `next.handle()`.
- `HealthService.check()` and `HealthResult` — gain `checkedAt: string` (ISO timestamp). The service owns the timestamp so it's consistent across JSON and HTML renderings.
- Idiomatic JSON controller becomes `@HealthCheck() public health(@HealthStatus() status: HealthResult): HealthResult { return status }` — the old empty-body shape no longer works because the interceptor doesn't replace the body.
- See README for the new HTML render example.

Breaking for consumers using `@HealthCheck()` on an empty-body controller method (the body is now whatever the method returns). Pre-1.0 minor bump under repo convention.
