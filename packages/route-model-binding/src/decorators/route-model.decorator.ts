import { createParamDecorator, type ExecutionContext } from "@nestjs/common"

import { RouteModelBindingNotAppliedException } from "../exceptions/route-model-binding-not-applied.exception"

/**
 * Parameter decorator that retrieves a model instance that was automatically
 * resolved from a route parameter by the `RouteModelBindingMiddleware`.
 *
 * If `req.routeModels` is `undefined` — meaning the middleware was not wired
 * up for the current route — this decorator throws a
 * {@link RouteModelBindingNotAppliedException} (HTTP 500) so the developer
 * misconfiguration is surfaced rather than masked as a 404.
 *
 * @param data - The name of the route parameter (without the colon).
 *               For example, for route "/users/:user", use "user".
 *
 * @throws {@link RouteModelBindingNotAppliedException} when
 *   `RouteModelBindingMiddleware` has not been applied to the route.
 *
 * @example
 * ```typescript
 * @Get("/users/:user/posts/:post")
 * getPost(
 *   @RouteModel("user") user: User,
 *   @RouteModel("post") post: Post
 * ) {
 *   return { user, post }
 * }
 * ```
 */
export const RouteModel = createParamDecorator(
  (data: string, context: ExecutionContext): unknown => {
    const req = context.switchToHttp().getRequest()

    if (req.routeModels === undefined) {
      throw new RouteModelBindingNotAppliedException(data)
    }

    return req.routeModels[data]
  },
)
