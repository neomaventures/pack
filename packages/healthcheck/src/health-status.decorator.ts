import { createParamDecorator, type ExecutionContext } from "@nestjs/common"

import { HEALTHCHECK_REQUEST_KEY } from "./healthcheck.constants"
import { type HealthResult } from "./healthcheck.types"

/**
 * Extracts the {@link HealthResult} that `HealthcheckInterceptor` ran
 * and attached to the current request. Use on any controller method
 * decorated with `@HealthCheck()` to keep the method body a thin pass-
 * through — no manual `HealthService` injection, no probe call, no
 * timestamp generation.
 *
 * Throws if the parameter is read on a request that wasn't routed
 * through `@HealthCheck()` — that's a configuration error (the
 * interceptor never ran), not a runtime concern.
 *
 * @example
 * ```ts
 * // JSON endpoint
 * @Get("api/health")
 * @HealthCheck()
 * public health(@HealthStatus() status: HealthResult): HealthResult {
 *   return status
 * }
 *
 * // HTML render
 * @Get("health")
 * @HealthCheck()
 * @Render("application/status")
 * public status(@HealthStatus() status: HealthResult): { result: HealthResult } {
 *   return { result: status }
 * }
 * ```
 */
export const HealthStatus = createParamDecorator(
  (_data: unknown, context: ExecutionContext): HealthResult => {
    const req = context.switchToHttp().getRequest<Record<string, unknown>>()
    const result = req[HEALTHCHECK_REQUEST_KEY] as HealthResult | undefined

    if (result === undefined) {
      throw new Error(
        "@HealthStatus() found no result on the request. Did you forget to apply @HealthCheck() to the route?",
      )
    }

    return result
  },
)
