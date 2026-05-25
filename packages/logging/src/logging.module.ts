import {
  type DynamicModule,
  type MiddlewareConsumer,
  Module,
  type NestModule,
  type Provider,
} from "@nestjs/common"
import { APP_INTERCEPTOR } from "@nestjs/core"

import { RequestLoggerInterceptor } from "./interceptors/request-logger.interceptor"
import {
  type LoggingConfiguration,
  type LoggingModuleAsyncOptions,
} from "./interfaces"
import { RequestLoggerMiddleware } from "./middlewares/request-logger.middleware"
import { ApplicationLoggerService, RequestLoggerService } from "./services"
import { LOGGING_MODULE_OPTIONS } from "./symbols"

// Shared by forRoot/forRootAsync; the options provider is prepended per-method.
const PROVIDERS: Provider[] = [
  ApplicationLoggerService,
  RequestLoggerService,
  RequestLoggerMiddleware,
  { provide: APP_INTERCEPTOR, useClass: RequestLoggerInterceptor },
]
const EXPORTS = [ApplicationLoggerService, RequestLoggerService]

/**
 * NestJS module providing structured logging with automatic request tracing.
 *
 * Features:
 * - **Two logger services**: ApplicationLoggerService (app-scoped) and RequestLoggerService (request-scoped)
 * - **Automatic request logging**: Logs incoming requests and responses when `logLevel: 'debug'`
 * - **Middleware integration**: RequestLoggerService automatically available as `req.logger` on all routes
 * - **Error interceptor**: Configurable automatic error logging with `logErrors` option
 * - **Field redaction**: Configurable sensitive data masking
 * - **Request tracing**: Automatic ULID generation or header extraction for request correlation
 * - **Context injection**: Merge custom metadata into all log entries
 * - **Performance optimized**: Uses Pino logger internally for high throughput
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
 *
 * @example
 * **Using req.logger (middleware approach):**
 * ```typescript
 * @Controller('users')
 * export class UserController {
 *   @Get(':id')
 *   getUser(@Req() req: Request, @Param('id') id: string) {
 *     // RequestLoggerService is attached to req.logger by the middleware
 *     req.logger?.log('Fetching user', { userId: id })
 *   }
 * }
 * ```
 */
@Module({})
export class LoggingModule implements NestModule {
  /**
   * Register the module with static options. All options are optional, so
   * `forRoot()` is valid and uses defaults.
   */
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

  /**
   * Register the module with options resolved asynchronously from DI.
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

  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes("*")
  }
}
