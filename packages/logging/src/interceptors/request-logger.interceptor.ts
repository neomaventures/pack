import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common"
import { PATH_METADATA } from "@nestjs/common/constants"
import { type Observable, tap } from "rxjs"

import { type LoggingConfiguration } from "../interfaces"
import { ApplicationLoggerService } from "../services"
import { LOGGING_MODULE_OPTIONS } from "../symbols"

/**
 * Interceptor that logs requests going into and coming out of route handlers.
 */
@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  /**
   * Creates an instance of RequestLoggerInterceptor.
   *
   * @param config - Logging configuration options injected from the module LoggingConfiguration
   * @param config.logErrors - Whether to log errors that occur in route handlers (default: false)
   * @param config.logLevel - The log level to use for logging requests (default: 'log')
   * @param config.logRedact - An array of paths to redact from logs (default: [])
   * @param config.logContext - Additional context to include in all log messages (default: {})
   *
   * @param logger - The ApplicationLoggerService instance used for logging
   */
  public constructor(
    @Inject(LOGGING_MODULE_OPTIONS)
    private readonly config: Pick<LoggingConfiguration, "logErrors">,
    private readonly logger: ApplicationLoggerService,
  ) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const start = Date.now()

    const controllerPath = Reflect.getMetadata(
      PATH_METADATA,
      context.getClass(),
    )
    const handlerPath = Reflect.getMetadata(PATH_METADATA, context.getHandler())
    const route = {
      controller: { name: context.getClass().name, path: controllerPath },
      handler: { name: context.getHandler().name, path: handlerPath },
    }

    this.logger.debug(
      "Processing an incoming request and dispatching it to a route handler.",
      route,
    )

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse()
          this.logger.debug(
            "Processed an incoming request that was successfully handled by a route handler.",
            {
              ...route,
              res: response,
              duration: `${Date.now() - start}ms`,
            },
          )
        },
        error: (error) => {
          if (this.config.logErrors) {
            this.logger.error(
              "Error processing an incoming request in the route handler.",
              {
                ...route,
                duration: `${Date.now() - start}ms`,
                err: error,
              },
            )
          }
        },
      }),
    )
  }
}
