---
"@neomaventures/healthcheck": minor
---

Add pluggable upstream probes via `HealthcheckModule.forRoot({ probes: { ... } })`. `probes` is a keyed object: the key becomes the result-record key under `body.probes`, and the value is either an HTTP probe (`{ url, timeout?, expect? }`) or a custom-check escape hatch (`{ check, timeout? }`). Using an object makes duplicate names a compile-time error and renders consumer config self-documenting. Each probe contributes `{ ok, latencyMs, error? }`; any failing probe flips the overall status to HTTP 503, matching the existing database-probe semantic. Adopts `ConfigurableModuleBuilder` internally; `HealthcheckModule.forRoot()` with no options behaves identically to v0.2.0 — the `probes` key is omitted from the response body when no probes are configured. No consumer migration required.
