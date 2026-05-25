import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from "@nestjs/common"
import { PATH_METADATA } from "@nestjs/common/constants"
import { Observable, tap } from "rxjs"

import { LoggingConfiguration } from "../interfaces"
import { LOGGING_MODULE_OPTIONS } from "../symbols"

/**
 * Interceptor that logs requests going into and coming out of route handlers.
 */
@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  /**
   * Creates an instance of RequestLoggerInterceptor.
   *
   * @param config The logging configuration - the only property used is `logErrors`
   * which determines whether errors caught during request processing should be logged
   * automatically.
   */
  public constructor(
    @Inject(LOGGING_MODULE_OPTIONS)
    private readonly config: LoggingConfiguration,
  ) {}

  /**
   * Intercepts the request and logs informtion about the route handler that the request
   * will be dispatched to and the result of processing once route handler has handled
   * the request.
   *
   * @param context Provides access to route handling information.
   * @param next used to continue processing the request.
   */
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
    const request = context.switchToHttp().getRequest()
    request.logger.debug(
      {
        controller: { name: context.getClass().name, path: controllerPath },
        handler: { name: context.getHandler().name, path: handlerPath },
      },
      "Processing an incoming request and dispatching it to a route handler.",
    )

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse()
          request.logger.debug(
            {
              controller: {
                name: context.getClass().name,
                path: controllerPath,
              },
              handler: { name: context.getHandler().name, path: handlerPath },
              res: response,
              duration: `${Date.now() - start}ms`,
            },
            "Processed an incoming request that was successfully handled by a route handler.",
          )
        },
        error: (error) => {
          if (this.config.logErrors) {
            const duration = Date.now() - start
            request.logger.error(
              "Error processing an incoming request in the route handler.",
              {
                controller: {
                  name: context.getClass().name,
                  path: controllerPath,
                },
                handler: { name: context.getHandler().name, path: handlerPath },
                duration: `${duration}ms`,
                err: error,
              },
            )
          }
        },
      }),
    )
  }
}
