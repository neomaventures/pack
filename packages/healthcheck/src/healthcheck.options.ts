import { type ProbeConfig } from "./probes/probe-config"

/**
 * Injection token for the resolved {@link HealthcheckOptions}. Consumers
 * normally don't need this — services in this package inject it for
 * configuration access. Exported as a public symbol so downstream callers
 * resolving the options on-demand can do so via `@Inject(HEALTHCHECK_OPTIONS)`.
 */
export const HEALTHCHECK_OPTIONS = Symbol("HEALTHCHECK_OPTIONS")

/**
 * Options accepted by {@link HealthcheckModule.forRoot} /
 * {@link HealthcheckModule.forRootAsync}.
 *
 * Every field is optional — `HealthcheckModule.forRoot()` with no argument is
 * supported and behaves identically to the v0.2.0 release.
 */
export interface HealthcheckOptions {
  /**
   * Pluggable upstream probes invoked on every `@HealthCheck()` request.
   *
   * Probes run in parallel; each contributes one entry under
   * `body.probes[<name>]`. Any failing probe flips the response status to
   * 503, matching the existing database-probe semantic.
   *
   * Defaults to `[]`. When the resolved list is empty, the runner is a no-op
   * and the `probes` key is omitted from the response body — exactly the
   * v0.2.0 shape.
   *
   * @example
   * ```ts
   * HealthcheckModule.forRoot({
   *   probes: [
   *     { name: "storage", url: `${process.env.S3_ENDPOINT}/minio/health/live` },
   *     { name: "mail", url: "https://api.resend.com/health", timeout: 3000 },
   *   ],
   * })
   * ```
   */
  probes?: ProbeConfig[]
}
