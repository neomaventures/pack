import { type DynamicModule, Module, type Provider } from "@nestjs/common"
import { APP_INTERCEPTOR } from "@nestjs/core"

import { RequestLoggerInterceptor } from "./interceptors/request-logger.interceptor"
import {
  type LoggingModuleAsyncOptions,
  type LoggingModuleOptions,
} from "./interfaces/logging-module-options.interface"
import { ApplicationLogger } from "./services/application-logger"
import { LoggerFactory } from "./services/logger-factory"
import { LOGGING_MODULE_OPTIONS } from "./symbols"

const APP_LOGGER_PROVIDER: Provider = {
  provide: ApplicationLogger,
  useFactory: (factory: LoggerFactory) => factory.createApplicationLogger(),
  inject: [LoggerFactory],
}

const PROVIDERS: Provider[] = [
  LoggerFactory,
  APP_LOGGER_PROVIDER,
  { provide: APP_INTERCEPTOR, useClass: RequestLoggerInterceptor },
]
const EXPORTS = [ApplicationLogger, LoggerFactory]

/**
 * NestJS module providing structured logging.
 *
 * Register the root via `forRoot()` / `forRootAsync()` once at the app's
 * root module; register per-package namespaced loggers via `forFeature()`
 * inside each package's own module.
 *
 * @see LoggingModule.forFeature — for per-package logger registration.
 */
@Module({})
export class LoggingModule {
  /**
   * Register the logging root for the application. Call **once** in the
   * application's root module. Provides {@link ApplicationLogger},
   * {@link LoggerFactory}, the `RequestLoggerInterceptor`, and the internal
   * `LOGGING_MODULE_OPTIONS` token. Module is global.
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
