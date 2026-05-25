import {
  DynamicModule,
  MiddlewareConsumer,
  Module,
  NestModule,
} from "@nestjs/common"
import { APP_INTERCEPTOR } from "@nestjs/core"

import { RequestLoggerInterceptor } from "./interceptors/request-logger.interceptor"
import { LoggingConfiguration } from "./interfaces"
import { RequestLoggerMiddleware } from "./middlewares/request-logger.middleware"
import { ApplicationLoggerService, RequestLoggerService } from "./services"
import { LOGGING_MODULE_OPTIONS } from "./symbols"

/**
 * NestJS module providing structured logging capabilities with automatic request tracing.
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
 * Must be registered via `forRoot()` which makes the module global.
 * A plain `LoggingModule` import is a no-op and does not register any providers.
 *
 * @example
 * // Register once at the app root — available everywhere
 * imports: [LoggingModule.forRoot()]
 *
 * @example
 * // With full configuration
 * imports: [
 *   LoggingModule.forRoot({
 *     logLevel: 'debug',
 *     logContext: { service: 'user-api' },
 *     logRedact: ['password', '*.secret'],
 *     logRequestTraceIdHeader: 'x-trace-id',
 *     logErrors: true
 *   })
 * ]
 *
 * @example
 * **Using the loggers:**
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(
 *     private appLogger: ApplicationLoggerService,    // App-scoped
 *     private reqLogger: RequestLoggerService         // Request-scoped
 *   ) {}
 *
 *   async createUser(data: CreateUserDto) {
 *     // App logger - no request context
 *     this.appLogger.log('Creating new user')
 *
 *     // Request logger - includes request context + trace ID
 *     this.reqLogger.log('User creation started', { email: data.email })
 *   }
 * }
 * ```
 *
 * @example
 * **Using req.logger (middleware approach):**
 * ```typescript
 * @Controller('users')
 * export class UserController {
 *   @Get(':id')
 *   getUser(@Req() req: Request, @Param('id') id: string) {
 *     // RequestLoggerService automatically available on req.logger
 *     req.logger.log('Fetching user', { userId: id })
 *     return this.userService.findById(id)
 *   }
 * }
 * ```
 */
@Module({})
export class LoggingModule implements NestModule {
  /**
   * Configure and register the LoggingModule globally.
   *
   * This is the only way to register logging providers. Call once in the root module —
   * services are available everywhere via `global: true`. All options are optional and
   * have sensible defaults.
   *
   * @param options - Logging configuration options (see LoggingConfiguration interface)
   * @returns Configured DynamicModule for use in module imports
   *
   * @example
   * **Production setup:**
   * ```typescript
   * LoggingModule.forRoot({
   *   logLevel: 'log',                        // Standard production level
   *   logContext: {
   *     service: 'user-service',
   *     version: process.env.APP_VERSION,
   *     environment: process.env.NODE_ENV
   *   },
   *   logRedact: ['password', '*.secret', 'authorization'],
   *   logRequestTraceIdHeader: 'x-correlation-id'
   * })
   * ```
   *
   * @example
   * **Development setup:**
   * ```typescript
   * LoggingModule.forRoot({
   *   logLevel: 'debug',                      // Enable request logging
   *   logContext: { service: 'api-dev' },
   *   logErrors: true                         // Log intercepted errors
   * })
   * ```
   *
   * **Behavior:**
   * - ApplicationLoggerService: Application-scoped, includes `logContext`
   * - RequestLoggerService: Request-scoped, includes `logContext` + request details + trace ID
   * - RequestLoggerMiddleware: Attaches RequestLoggerService to `req.logger` for all routes
   * - RequestLoggerInterceptor: Automatically logs requests/responses when `logLevel: 'debug'`
   * - Error logging: Configurable via `logErrors` option for intercepted errors
   */
  public static forRoot(options: LoggingConfiguration = {}): DynamicModule {
    return {
      global: true,
      module: LoggingModule,
      providers: [
        ApplicationLoggerService,
        RequestLoggerService,
        {
          provide: LOGGING_MODULE_OPTIONS,
          useValue: options,
        },
        RequestLoggerMiddleware,
        {
          provide: APP_INTERCEPTOR,
          useClass: RequestLoggerInterceptor,
        },
      ],
      exports: [ApplicationLoggerService, RequestLoggerService],
    }
  }

  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes("*")
  }
}
