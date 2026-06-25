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
  ) {
    const probes = this.options.probes ?? []
    const names = probes.map((p) => p.name)
    if (new Set(names).size !== names.length) {
      console.warn(
        `[healthcheck] Duplicate probe names detected — last-write-wins on the result record. names=${JSON.stringify(names)}`,
      )
    }
  }

  /**
   * Runs every configured probe in parallel and folds the results into a
   * single record keyed by probe name.
   *
   * Returns `undefined` when no probes are configured — the caller drops
   * the `probes` key from the response body entirely, preserving the
   * v0.2.0 wire shape for consumers that don't opt in.
   */
  public async run(): Promise<Record<string, ProbeResult> | undefined> {
    const probes = this.options.probes ?? []
    if (probes.length === 0) {
      return undefined
    }

    const settled = await Promise.allSettled(
      probes.map((probe) => this.runOne(probe)),
    )

    const record: Record<string, ProbeResult> = {}
    for (let i = 0; i < probes.length; i++) {
      const probe = probes[i]
      const outcome = settled[i]
      record[probe.name] =
        outcome.status === "fulfilled"
          ? outcome.value
          : { ok: false, latencyMs: 0, error: String(outcome.reason) }
    }

    return record
  }

  private async runOne(config: ProbeConfig): Promise<ProbeResult> {
    if ("url" in config) {
      return this.runHttp(config)
    }
    return this.runCustom(config)
  }

  private async runHttp(config: HttpProbeConfig): Promise<ProbeResult> {
    const start = Date.now()
    const controller = new AbortController()
    const timeoutMs = config.timeout ?? PROBE_TIMEOUT_MS
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(config.url, { signal: controller.signal })
      const expectedStatus = config.expect?.status
      const ok =
        expectedStatus === undefined
          ? response.status >= 200 && response.status < 300
          : response.status === expectedStatus

      if (ok) {
        return { ok: true, latencyMs: Date.now() - start }
      }
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: `Expected ${expectedStatus ?? "2xx"}, got ${response.status}`,
      }
    } catch (err) {
      const latencyMs = Date.now() - start
      if ((err as Error).name === "AbortError") {
        return { ok: false, latencyMs, error: `Timeout after ${timeoutMs}ms` }
      }
      return { ok: false, latencyMs, error: (err as Error).message }
    } finally {
      clearTimeout(timer)
    }
  }

  private async runCustom(config: CustomProbeConfig): Promise<ProbeResult> {
    const start = Date.now()
    const timeoutMs = config.timeout ?? PROBE_TIMEOUT_MS
    let timer: NodeJS.Timeout | undefined

    try {
      const outcome = await Promise.race([
        // Wrap synchronous throws into rejections so the race observes them.
        Promise.resolve().then(() => config.check()),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`Timeout after ${timeoutMs}ms`)),
            timeoutMs,
          )
        }),
      ])
      return outcome.ok
        ? { ok: true, latencyMs: Date.now() - start }
        : { ok: false, latencyMs: Date.now() - start, error: outcome.error }
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: (err as Error).message,
      }
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
  }
}
