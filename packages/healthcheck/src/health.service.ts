import { Inject, Injectable, Optional } from "@nestjs/common"
import { getDataSourceToken } from "@nestjs/typeorm"
import { type DataSource } from "typeorm"

import { PROBE_TIMEOUT_MS } from "./healthcheck.constants"
import { type HealthResult } from "./healthcheck.types"

/**
 * Aggregates the result of every auto-detected health probe.
 *
 * Exported as the package's primary injectable so consumers can call
 * `check()` from anywhere — guards, schedulers, custom dashboard routes —
 * without going through the HTTP layer.
 */
@Injectable()
export class HealthService {
  public constructor(
    @Optional()
    @Inject(getDataSourceToken())
    private readonly dataSource?: DataSource,
  ) {}

  /**
   * Runs every auto-detected probe and returns the aggregated result.
   *
   * - `http` is always `"ok"` — if this method returns, HTTP works.
   * - `database` is included only when a default TypeORM `DataSource` is
   *   registered in the consuming app. Errors from the probe — including
   *   the {@link PROBE_TIMEOUT_MS} timeout — are caught and surfaced as
   *   `"error"`; this method never throws. The 503 status on the wrapped
   *   route is the failure signal — no logger is used so consumers don't
   *   pay observability noise on every failed probe.
   * - `checkedAt` is the ISO timestamp the probes were run at. The service
   *   owns this value (rather than the consuming controller) so the
   *   timestamp is consistent across JSON and HTML renderings and
   *   reflects the actual probe time, not the response-formatting time.
   *
   * @returns The aggregated probe result.
   *
   * @example
   * ```ts
   * const result = await healthService.check()
   * // { http: "ok", database: "ok", checkedAt: "2026-06-12T..." }
   * ```
   */
  public async check(): Promise<HealthResult> {
    const checkedAt = new Date().toISOString()
    const result: HealthResult = { http: "ok", checkedAt }

    if (this.dataSource) {
      try {
        await this.race(this.dataSource.query("SELECT 1"))
        result.database = "ok"
      } catch {
        result.database = "error"
      }
    }

    return result
  }

  /**
   * Races the given promise against a `PROBE_TIMEOUT_MS` deadline so a
   * hung connection can't stall the whole healthcheck endpoint past the
   * orchestrator's own external timeout.
   */
  private async race<T>(probe: Promise<T>): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined
    try {
      return await Promise.race([
        probe,
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error("probe timed out")),
            PROBE_TIMEOUT_MS,
          )
        }),
      ])
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }
}
