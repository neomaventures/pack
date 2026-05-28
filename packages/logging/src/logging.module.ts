import { type DynamicModule, Module, type Provider } from "@nestjs/common"
import { APP_INTERCEPTOR } from "@nestjs/core"

import { RequestLoggerInterceptor } from "./interceptors/request-logger.interceptor"
import {
  type LoggingConfiguration,
  type LoggingModuleAsyncOptions,
} from "./interfaces"
import { ApplicationLoggerService } from "./services"
import { LOGGING_MODULE_OPTIONS } from "./symbols"

const PROVIDERS: Provider[] = [
  ApplicationLoggerService,
  { provide: APP_INTERCEPTOR, useClass: RequestLoggerInterceptor },
]
const EXPORTS = [ApplicationLoggerService]

/**
 * NestJS module providing structured logging with automatic request tracing.
 *
 * Features:
 * - **Structured logging** via `ApplicationLoggerService`, which reads the current
 *   request from `@neoma/request-context` and attaches it to log entries.
 * - **Automatic request logging** via `RequestLoggerInterceptor` when
 *   `logLevel: 'debug'`.
 * - **Error interceptor**: Configurable automatic error logging with `logErrors`.
 * - **Field redaction**: Configurable sensitive data masking.
 * - **Context injection**: Merge custom metadata into all log entries.
 * - **Performance optimized**: Uses Pino logger internally for high throughput.
 *
 * Register via `forRoot()` or `forRootAsync()` (both make the module global).
 * The module is not designed to be imported bare.
 *
 * @example
 * // Static registration at the app root — available everywhere
 * imports: [LoggingModule.forRoot({ logLevel: 'debug' })]
 *
 * @example
 * // Async registration — resolve options from DI (e.g. ConfigService)
 * imports: [
 *   LoggingModule.forRootAsync({
 *     inject: [ConfigService],
 *     useFactory: (config: ConfigService) => ({
 *       logLevel: config.get('LOG_LEVEL'),
 *       logRedact: ['password', '*.secret'],
 *     }),
 *   }),
 * ]
 */
@Module({})
export class LoggingModule {
  public static forRoot(options: LoggingConfiguration = {}): DynamicModule {
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
