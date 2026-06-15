import { type DynamicModule, Module, type Provider } from "@nestjs/common"
import { APP_INTERCEPTOR } from "@nestjs/core"

import { RequestLoggerInterceptor } from "./interceptors/request-logger.interceptor"
import {
  type LoggingModuleAsyncOptions,
  type LoggingModuleOptions,
} from "./interfaces/logging-module-options.interface"
import { ApplicationLogger } from "./services/application-logger"
import { LOGGING_MODULE_OPTIONS } from "./symbols"

const PROVIDERS: Provider[] = [
  ApplicationLogger,
  { provide: APP_INTERCEPTOR, useClass: RequestLoggerInterceptor },
]
const EXPORTS = [ApplicationLogger]

/**
 * NestJS module providing structured logging.
 *
 * Register via `forRoot()` or `forRootAsync()` — both make the module global.
 *
 * @see LoggingModule.forFeature — for per-package logger registration.
 */
@Module({})
export class LoggingModule {
  /**
   * Register the logging root for the application. Call **once** in the
   * application's root module. Provides {@link ApplicationLogger}, the
   * `RequestLoggerInterceptor`, and the internal `LOGGING_MODULE_OPTIONS`
   * token. Module is global.
   *
   * @param options - App-wide configuration. Omit for defaults (`info` level,
   *   stdout destination, no overrides).
   * @returns A `DynamicModule` ready to be added to `AppModule.imports`.
   *
   * @example
   * ```ts
   * @Module({
   *   imports: [LoggingModule.forRoot({ defaultLevel: "debug" })],
   * })
   * export class AppModule {}
   * ```
   */
  public static forRoot(options: LoggingModuleOptions = {}): DynamicModule {
    return {
      global: true,
      module: LoggingModule,
      providers: [
        { provide: LOGGING_MODULE_OPTIONS, useValue: options },
        ...PROVIDERS,
      ],
      exports: EXPORTS,
    }
  }

  /**
   * Async variant of {@link LoggingModule.forRoot}. Use when options must be
   * resolved from `ConfigService` or another async source.
   *
   * @param options - Async options descriptor with `useFactory`.
   * @returns A `DynamicModule` ready to be added to `AppModule.imports`.
   *
   * @example
   * ```ts
   * LoggingModule.forRootAsync({
   *   imports: [ConfigModule],
   *   inject: [ConfigService],
   *   useFactory: (cfg: ConfigService) => ({ defaultLevel: cfg.get("LOG_LEVEL") }),
   * })
   * ```
   */
  public static forRootAsync(
    options: LoggingModuleAsyncOptions,
  ): DynamicModule {
    return {
      global: true,
      module: LoggingModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: LOGGING_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...PROVIDERS,
      ],
      exports: EXPORTS,
    }
  }
}
