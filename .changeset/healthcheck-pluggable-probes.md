---
"@neomaventures/healthcheck": minor
---

Add pluggable upstream probes via `HealthcheckModule.forRoot({ probes: [...] })`. Each probe contributes a named entry to `body.probes` with `{ ok, latencyMs, error? }`; any failing probe flips the overall status to HTTP 503, matching the existing database-probe semantic. Two probe shapes ship: HTTP (`{ name, url, timeout?, expect? }`) covers the common case (MinIO `/minio/health/live`, mail-provider health endpoints, generic SaaS APIs); a custom-check escape hatch (`{ name, check }`) covers dependencies without an HTTP probe. Adopts `ConfigurableModuleBuilder` internally; `HealthcheckModule.forRoot()` with no options behaves identically to v0.2.0 — the `probes` key is omitted from the response body when no probes are configured. No consumer migration required.
