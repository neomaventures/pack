import { Inject, Injectable } from "@nestjs/common"

import { PROBE_TIMEOUT_MS } from "../healthcheck.constants"
import {
  HEALTHCHECK_OPTIONS,
  type HealthcheckOptions,
} from "../healthcheck.options"

import {
  type CustomProbeConfig,
  type HttpProbeConfig,
  type ProbeConfig,
  type ProbeResult,
} from "./probe-config"

/**
 * Internal probe representation — every config (HTTP, custom) is desugared
 * into this shape before running so the runner has a single execution path.
 *
 * `check` resolves on success and rejects on failure. The runner observes
 * the `AbortSignal` argument and aborts in-flight work when the per-probe
 * timeout elapses.
 */
interface Probe {
  timeoutMs: number
  check: (signal: AbortSignal) => Promise<void>
}

/**
 * Runs the configured upstream probes for every `@HealthCheck()` request.
 *
 * **Internal to the package** — not exported from `index.ts`. Consumers
 * configure probes via {@link HealthcheckOptions.probes}; the runner is
 * folded into {@link HealthService.check} automatically.
 *
 * The runner is total: a probe that throws synchronously, rejects, times
 * out, or never resolves all surface as
 * `{ ok: false, error: <message>, latencyMs }`. `HealthService` never
 * re-raises.
 */
@Injectable()
export class ProbeRunnerService {
  public constructor(
    @Inject(HEALTHCHECK_OPTIONS)
    private readonly options: HealthcheckOptions,
  ) {}

  /**
   * Runs every configured probe in parallel and folds the results into a
   * single record keyed by probe name.
   *
   * Returns `undefined` when no probes are configured — the caller drops
   * the `probes` key from the response body entirely, preserving the
   * v0.2.0 wire shape for consumers that don't opt in.
   */
  public async run(): Promise<Record<string, ProbeResult> | undefined> {
    const configs = this.options.probes ?? {}
    const names = Object.keys(configs)
    if (names.length === 0) {
      return undefined
    }

    const results = await Promise.all(
      names.map((name) => this.runOne(this.desugar(configs[name]))),
    )

    const record: Record<string, ProbeResult> = {}
    for (let i = 0; i < names.length; i++) {
      record[names[i]] = results[i]
    }
    return record
  }

  /**
   * Desugar each consumer-facing probe shape into the internal
   * `Probe` representation. HTTP becomes a `fetch` against `url` whose
   * resolution depends on the response status and optional
   * `expect.status`; custom is passed through almost unchanged, with a
   * tiny adapter that translates `{ ok: false, error }` into a rejection
   * so the runner has one outcome model.
   */
  private desugar(config: ProbeConfig): Probe {
    const timeoutMs = config.timeout ?? PROBE_TIMEOUT_MS
    if ("url" in config) {
      return { timeoutMs, check: this.httpCheck(config) }
    }
    return { timeoutMs, check: this.customCheck(config) }
  }

  private httpCheck(
    config: HttpProbeConfig,
  ): (signal: AbortSignal) => Promise<void> {
    return async (signal) => {
      const response = await fetch(config.url, { signal })
      const expected = config.expect?.status
      const ok =
        expected === undefined
          ? response.status >= 200 && response.status < 300
          : response.status === expected
      if (!ok) {
        throw new Error(`Expected ${expected ?? "2xx"}, got ${response.status}`)
      }
    }
  }

  private customCheck(
    config: CustomProbeConfig,
  ): (_signal: AbortSignal) => Promise<void> {
    return async () => {
      // Wrap so synchronous throws become rejections we can observe.
      const outcome = await Promise.resolve().then(() => config.check())
      if (!outcome.ok) {
        throw new Error(outcome.error)
      }
    }
  }

  /**
   * Race the desugared `check` against the per-probe timeout, capture
   * real latency in both the fulfilled and rejected branches, and map
   * the outcome onto `{ ok, latencyMs, error? }`.
   */
  private async runOne(probe: Probe): Promise<ProbeResult> {
    const started = performance.now()
    const controller = new AbortController()
    let timer: NodeJS.Timeout | undefined

    try {
      await Promise.race([
        probe.check(controller.signal),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort()
            reject(new Error(`Timeout after ${probe.timeoutMs}ms`))
          }, probe.timeoutMs)
        }),
      ])
      return { ok: true, latencyMs: this.elapsed(started) }
    } catch (err) {
      const latencyMs = this.elapsed(started)
      const error = err as Error
      if (error.name === "AbortError") {
        return {
          ok: false,
          latencyMs,
          error: `Timeout after ${probe.timeoutMs}ms`,
        }
      }
      return { ok: false, latencyMs, error: error.message }
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
  }

  private elapsed(startedAt: number): number {
    return Math.max(0, Math.round(performance.now() - startedAt))
  }
}
