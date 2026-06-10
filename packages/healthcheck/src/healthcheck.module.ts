import { type DynamicModule, Module } from "@nestjs/common"
import { APP_INTERCEPTOR } from "@nestjs/core"

import { HealthService } from "./health.service"
import { HealthcheckInterceptor } from "./healthcheck.interceptor"

/**
 * NestJS dynamic module that wires up the healthcheck infrastructure:
 * `HealthService` (the primary injectable) and `HealthcheckInterceptor`
 * (registered globally via `APP_INTERCEPTOR`).
 */
@Module({})
export class HealthcheckModule {
  /**
   * Registers `HealthService` and the global interceptor that powers
   * `@HealthCheck()`.
   *
   * Import once in the consuming `AppModule`. Not `@Global()` — the
   * `APP_INTERCEPTOR` registration is process-wide regardless, and
   * `HealthService` is only needed where it's explicitly imported.
   *
   * @returns A `DynamicModule` providing `HealthService` and registering
   *          `HealthcheckInterceptor` as a global interceptor.
   *
   * @example
   * ```ts
   * @Module({
   *   imports: [HealthcheckModule.forRoot()],
   * })
   * export class AppModule {}
   * ```
   */
  public static forRoot(): DynamicModule {
    return {
      module: HealthcheckModule,
      providers: [
        HealthService,
        HealthcheckInterceptor,
        { provide: APP_INTERCEPTOR, useClass: HealthcheckInterceptor },
      ],
      exports: [HealthService],
    }
  }
}
