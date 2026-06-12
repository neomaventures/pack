import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { from, mergeMap, type Observable } from "rxjs"

import { HealthService } from "./health.service"
import {
  HEALTHCHECK_METADATA_KEY,
  HEALTHCHECK_REQUEST_KEY,
} from "./healthcheck.constants"

/**
 * Global interceptor that runs the probes for any route marked with
 * `@HealthCheck()`, sets the HTTP status (503 if any probe is in error,
 * 200 otherwise), attaches the aggregated `HealthResult` to the current
 * request under {@link HEALTHCHECK_REQUEST_KEY}, and then hands control
 * to the controller method via `next.handle()`.
 *
 * Controller methods extract the result via the `@HealthStatus()`
 * parameter decorator — they don't need to inject `HealthService`
 * themselves. This keeps controllers as dumb pipes (return the data,
 * optionally for `@Render`) and concentrates the probe + status logic
 * in the package.
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
   * Passes the call through for unmarked routes. For `@HealthCheck()`
   * routes, awaits the probe, sets HTTP status, attaches the result to
   * the request, then proceeds to the controller.
   *
   * @param context - The current execution context.
   * @param next - The downstream handler in the interceptor chain.
   * @returns An observable yielding either the downstream result
   *          unchanged (unmarked routes) or the controller method's
   *          return value (marked routes; the controller now runs
   *          rather than being short-circuited).
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

    if (context.getType() !== "http") {
      throw new Error(
        `@HealthCheck() currently only supports HTTP routes; received context type "${context.getType()}".`,
      )
    }

    return from(this.probeAndAttach(context)).pipe(
      mergeMap(() => next.handle()),
    )
  }

  /**
   * Runs the probe, sets the response status, and stashes the result on
   * the request so `@HealthStatus()` can read it during parameter
   * resolution.
   */
  private async probeAndAttach(context: ExecutionContext): Promise<void> {
    const result = await this.healthService.check()
    const anyError = Object.values(result).some((value) => value === "error")

    const http = context.switchToHttp()
    http
      .getResponse<{ status: (code: number) => unknown }>()
      .status(anyError ? 503 : 200)
    ;(http.getRequest() as Record<string, unknown>)[HEALTHCHECK_REQUEST_KEY] =
      result
  }
}
