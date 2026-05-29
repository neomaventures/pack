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
 * - **Structured logging** via `ApplicationLoggerService`, which reads the current
 *   request from `@neoma/request-context` and attaches it to log entries as a
 *   `req` field.
 * - **Automatic request logging** via `RequestLoggerInterceptor` when
 *   `logLevel: 'debug'`.
 * - **Error interceptor**: Configurable automatic error logging with `logErrors`.
 * - **Field redaction**: Configurable sensitive data masking.
 * - **Context injection**: Merge custom metadata into all log entries.
 *
 * Note: per-request trace ID generation (the old `logRequestTraceIdHeader`
 * feature) is not yet restored — tracked in #69.
 * - **Performance optimized**: Uses Pino logger internally for high throughput.
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
 * ## Convention for `@neoma/*` packages
 *
 * Inside other Neoma packages, **inject `ApplicationLoggerService`** rather
 * than using `Logger` from `@nestjs/common`. Every Neoma package that logs
 * declares `@neoma/logging` as a peerDependency. Consumers install
 * `LoggingModule.forRoot()` once at the root; the singleton is available to
 * every package below.
 *
 * Nest's own internal logs (RouterExplorer, etc.) still flow through Nest's
 * `Logger`. Use `app.useLogger(app.get(ApplicationLoggerService))` with
 * `NestFactory.create(AppModule, { bufferLogs: true })` to capture those
 * through the structured logger.
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
