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
 * NestJS module providing structured logging with request-scoped context.
 *
 * Features:
 * - **Structured logging** via `ApplicationLoggerService`, which reads the
 *   current request from `@neoma/request-context` and attaches it to log
 *   entries as a `req` field.
 * - **Automatic request logging** via `RequestLoggerInterceptor` when
 *   `logLevel: 'debug'`.
 * - **Error interceptor**: Configurable automatic error logging with
 *   `logErrors`.
 * - **Field redaction**: Configurable sensitive data masking.
 * - **Context injection**: Merge custom metadata into all log entries.
 * - **Performance optimized**: pino under the hood.
 *
 * Note: per-request trace ID generation is not yet restored — tracked in #69.
 *
 * Register via `forRoot()` or `forRootAsync()` (both make the module global).
 * The module is not designed to be imported bare.
 *
 * ## Required companion: `@neoma/request-context`
 *
 * `ApplicationLoggerService` reads the active request via `getRequest()` from
 * `@neoma/request-context`. For the `req` field to appear on log entries the
 * consumer app **must** also install the request-context boundary:
 *
 * ```typescript
 * imports: [
 *   RequestContextModule.forRoot(),  // <-- required for getRequest() to work
 *   LoggingModule.forRoot({ logLevel: 'debug' }),
 * ]
 * ```
 *
 * Without `RequestContextModule.forRoot()`, log entries still emit but `req`
 * will always be absent.
 *
 * ## Not a Nest `LoggerService`
 *
 * `ApplicationLoggerService` deliberately does not implement
 * `@nestjs/common`'s `LoggerService` interface. It is **not** the app's main
 * logger — `app.useLogger(applicationLoggerService)` will not type-check, and
 * is not the intended integration. Nest's own framework logs continue to flow
 * through Nest's `ConsoleLogger`; this service is the **structured logger for
 * application code** and the rest of the Neoma ecosystem.
 *
 * Two access paths:
 *
 * 1. **Inject `ApplicationLoggerService`** anywhere in the DI graph for the
 *    typed structured API.
 * 2. **Static delegates** — `ApplicationLoggerService.log(...)`,
 *    `ApplicationLoggerService.error(...)`, etc. — for decorators and other
 *    non-DI code that still needs the structured pipeline.
 *
 * ## Convention for `@neoma/*` packages
 *
 * Inside other Neoma packages, **inject `ApplicationLoggerService`**. Every
 * Neoma package that logs declares `@neoma/logging` as a peerDependency.
 * Consumers install `LoggingModule.forRoot()` once at the root; the singleton
 * is available to every package below.
 *
 * @example
 * // Static registration at the app root — available everywhere
 * imports: [
 *   RequestContextModule.forRoot(),
 *   LoggingModule.forRoot({ logLevel: 'debug' }),
 * ]
 *
 * @example
 * // Async registration — resolve options from DI (e.g. ConfigService)
 * imports: [
 *   RequestContextModule.forRoot(),
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
