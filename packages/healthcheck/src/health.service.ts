import { Inject, Injectable, Optional } from "@nestjs/common"
import { getDataSourceToken } from "@nestjs/typeorm"
import { type DataSource } from "typeorm"

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
   *   registered in the consuming app. Errors from the probe are caught
   *   and surfaced as `"error"`; this method never throws. The 503 status
   *   on the wrapped route is the failure signal — no logger is used so
   *   consumers don't pay observability noise on every failed probe.
   *
   * @returns The aggregated probe result.
   *
   * @example
   * ```ts
   * const result = await healthService.check()
   * // { http: "ok", database: "ok" }
   * ```
   */
  public async check(): Promise<HealthResult> {
    const result: HealthResult = { http: "ok" }

    if (this.dataSource) {
      try {
        await this.dataSource.query("SELECT 1")
        result.database = "ok"
      } catch {
        result.database = "error"
      }
    }

    return result
  }
}
