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
 * If `req.routeModels` is populated but does not contain the requested key —
 * meaning the decorator's `data` argument doesn't match any route parameter
 * the middleware resolved — this decorator throws a plain `Error` listing the
 * available keys. Both cases are programmer errors and surface as HTTP 500.
 *
 * @param data - The name of the route parameter (without the colon).
 *               For example, for route "/users/:user", use "user".
 *
 * @throws {@link RouteModelBindingNotAppliedException} when
 *   `RouteModelBindingMiddleware` has not been applied to the route.
 * @throws `Error` when the requested key is not present in `req.routeModels`.
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

    if (!(data in req.routeModels)) {
      const available = Object.keys(req.routeModels as Record<string, unknown>)
        .map((k) => `"${k}"`)
        .join(", ")
      throw new Error(
        `@RouteModel("${data}") was invoked but no model was resolved for ` +
          `that key. Available keys: [${available}]. Check that the key ` +
          `matches the route parameter name.`,
      )
    }

    return req.routeModels[data]
  },
)
