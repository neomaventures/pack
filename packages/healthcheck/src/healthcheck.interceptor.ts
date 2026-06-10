import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { from, type Observable } from "rxjs"

import { HealthService } from "./health.service"
import { HEALTHCHECK_METADATA_KEY } from "./healthcheck.constants"
import { type HealthResult } from "./healthcheck.types"

/**
 * Global interceptor that intercepts routes marked with `@HealthCheck()`,
 * runs the probes via `HealthService`, sets the HTTP status, and emits the
 * aggregated `HealthResult` as the response body.
 *
 * Registered automatically by `HealthcheckModule.forRoot()` via
 * `APP_INTERCEPTOR`.
 */
@Injectable()
export class HealthcheckInterceptor implements NestInterceptor {
  public constructor(
    private readonly reflector: Reflector,
    private readonly healthService: HealthService,
  ) {}

  /**
   * Either passes the call through (for unmarked routes) or short-circuits
   * the controller method and emits the probe result.
   *
   * @param context - The current execution context.
   * @param next - The downstream handler in the interceptor chain.
   * @returns An observable yielding either the downstream result or the
   *          aggregated `HealthResult`.
   */
  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const isHealthcheck = this.reflector.get<boolean>(
      HEALTHCHECK_METADATA_KEY,
      context.getHandler(),
    )

    if (!isHealthcheck) {
      return next.handle()
    }

    return from(this.run(context))
  }

  private async run(context: ExecutionContext): Promise<HealthResult> {
    const result = await this.healthService.check()
    const anyError = Object.values(result).some((value) => value === "error")
    const response = context
      .switchToHttp()
      .getResponse<{ status: (code: number) => unknown }>()
    response.status(anyError ? 503 : 200)
    return result
  }
}
