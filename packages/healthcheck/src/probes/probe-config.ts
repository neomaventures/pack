/**
 * Map of pluggable upstream probes keyed by name. The key is the stable
 * identifier under which the result is reported in `body.probes[<name>]`;
 * the value is either an {@link HttpProbeConfig} (most consumers) or a
 * {@link CustomProbeConfig} (escape hatch for non-HTTP backends or richer
 * semantics).
 *
 * Discriminator on the value: presence of the `url` field selects the HTTP
 * branch; otherwise the probe is treated as custom.
 *
 * Using a keyed object (rather than an array) makes duplicate names a
 * compile-time error and renders consumer config self-documenting.
 */
export type ProbeMap = Record<string, HttpProbeConfig | CustomProbeConfig>

/**
 * Union of the two configured probe shapes. Retained as a convenience for
 * consumers handling either branch in a single expression.
 */
export type ProbeConfig = HttpProbeConfig | CustomProbeConfig

/**
 * HTTP probe — issues a `GET` against `url` via the global `fetch` and
 * reports the result.
 *
 * Any 2xx is considered healthy unless {@link HttpProbeConfig.expect} is
 * supplied, in which case the response status must match exactly.
 */
export interface HttpProbeConfig {
  /**
   * Absolute URL the probe issues a `GET` against.
   */
  url: string

  /**
   * Per-probe timeout in milliseconds. Defaults to `PROBE_TIMEOUT_MS`
   * (5000 ms). When the deadline elapses the underlying fetch is aborted
   * via `AbortController` and the probe reports
   * `{ ok: false, error: "Timeout after <ms>ms" }`.
   */
  timeout?: number

  /**
   * Expected response status. When omitted any 2xx is considered healthy;
   * when supplied the response status must equal `expect.status` exactly.
   */
  expect?: { status: number }
}

/**
 * Custom probe — escape hatch for dependencies without a simple HTTP probe
 * (TCP/SMTP, message queues, third-party SDKs).
 */
export interface CustomProbeConfig {
  /**
   * Probe implementation. Resolves to `{ ok: true }` on success, or
   * `{ ok: false, error }` to surface a domain-specific error message.
   *
   * Note: the runner uses `Promise.race` to enforce {@link timeout} because
   * it cannot cancel a consumer-supplied promise. When the deadline is hit
   * the runner reports `{ ok: false, error: "Timeout after <ms>ms" }` and
   * the underlying check keeps running until it settles naturally.
   */
  check: () => Promise<{ ok: true } | { ok: false; error: string }>

  /**
   * Per-probe timeout in milliseconds. Defaults to `PROBE_TIMEOUT_MS`
   * (5000 ms).
   */
  timeout?: number
}

/**
 * Per-probe result rendered under `body.probes[<name>]`.
 *
 * `latencyMs` is always recorded — even on failure — so consumers can
 * diagnose slow-degrading upstreams without bolting on a separate metric.
 */
export interface ProbeResult {
  ok: boolean
  latencyMs: number
  error?: string
}
