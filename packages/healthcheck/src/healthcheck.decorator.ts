import { SetMetadata } from "@nestjs/common"

import { HEALTHCHECK_METADATA_KEY } from "./healthcheck.constants"

/**
 * Marks a controller route as a healthcheck endpoint.
 *
 * The decorated method body is ignored at runtime — the global
 * `HealthcheckInterceptor` replaces the response with
 * `HealthService.check()` and sets HTTP `200` (all probes ok) or `503`
 * (any probe in error).
 *
 * @returns A NestJS method decorator that flags the route.
 *
 * @example
 * ```ts
 * @Controller()
 * export class HealthController {
 *   @Get("api/health")
 *   @HealthCheck()
 *   public health(): void {}
 * }
 * ```
 */
export const HealthCheck = (): MethodDecorator =>
  SetMetadata(HEALTHCHECK_METADATA_KEY, true)
