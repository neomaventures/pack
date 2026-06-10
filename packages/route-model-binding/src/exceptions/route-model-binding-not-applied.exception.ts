import { HttpStatus, InternalServerErrorException } from "@nestjs/common"

/**
 * Thrown by the `@RouteModel()` parameter decorator when it is invoked on a
 * route where the `RouteModelBindingMiddleware` has not been applied.
 *
 * The middleware is responsible for populating `req.routeModels`. When the
 * decorator finds that property to be `undefined`, this exception is raised
 * (HTTP 500) instead of masking the developer error as a 404, since this
 * indicates a misconfiguration in the consuming application rather than a
 * legitimate "not found" response to the client.
 *
 * To fix this, wire `RouteModelBindingMiddleware` into the affected route via
 * the module's `configure()`:
 *
 * @example
 * ```typescript
 * export class AppModule implements NestModule {
 *   public configure(consumer: MiddlewareConsumer): void {
 *     consumer.apply(RouteModelBindingMiddleware).forRoutes("users/:user")
 *   }
 * }
 * ```
 */
export class RouteModelBindingNotAppliedException extends InternalServerErrorException {
  public readonly paramName: string

  public constructor(paramName: string) {
    const message =
      `@RouteModel("${paramName}") was invoked but req.routeModels is ` +
      `undefined. Ensure RouteModelBindingMiddleware is applied to this ` +
      `route via configure() in your module.`

    super({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      paramName,
      error: "Internal Server Error",
    })

    this.paramName = paramName
  }
}
