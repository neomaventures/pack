/**
 * Aggregated result returned by `HealthService.check()` and serialised as the
 * JSON body of any `@HealthCheck()` route.
 *
 * `http` is always `"ok"` — if the value is produced, the HTTP stack works.
 * `database` is included only when a TypeORM `DataSource` is registered in
 * the consuming application.
 */
export type HealthResult = {
  http: "ok"
  database?: "ok" | "error"
}
