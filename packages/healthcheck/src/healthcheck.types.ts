import { type ProbeResult } from "./probes/probe-config"

/**
 * Aggregated result returned by `HealthService.check()` and serialised as the
 * JSON body of any `@HealthCheck()` route.
 *
 * `http` is always `"ok"` — if the value is produced, the HTTP stack works.
 * `database` is included only when a TypeORM `DataSource` is registered in
 * the consuming application.
 * `probes` is included only when one or more probes are configured via
 * `HealthcheckModule.forRoot({ probes: [...] })`. When omitted the wire
 * shape matches v0.2.0 verbatim.
 * `checkedAt` is the `Date` at which the probes were run. JSON serialisation
 * converts it to an ISO string at the wire boundary; HTML render contexts
 * receive the `Date` and can format it however the template needs.
 * Formatting is a rendering concern, not a service-layer concern.
 */
export type HealthResult = {
  http: "ok"
  database?: "ok" | "error"
  probes?: Record<string, ProbeResult>
  checkedAt: Date
}
