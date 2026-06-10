import {
  createParamDecorator,
  type ExecutionContext,
  NotFoundException,
} from "@nestjs/common"

import { RouteModelBindingNotAppliedException } from "../exceptions/route-model-binding-not-applied.exception"

/**
 * Parameter decorator that retrieves a model instance that was automatically
 * resolved from a route parameter by the RouteModelBindingMiddleware.
 *
 * If the resolved model is `null` (i.e. the entity was not found in the
 * database), this decorator throws a {@link NotFoundException} using
 * metadata from `req.routeModelMeta` to produce a meaningful error message.
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
 * @throws {@link NotFoundException} when the resolved entity is `null`, or
 *   when the param key is not present on `req.routeModels`.
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

    const models = req.routeModels
    const entity = models?.[data]

    if (entity == null) {
      const meta = req.routeModelMeta?.[data]
      const entityName = meta?.entityName ?? data
      const id = meta?.id ?? "unknown"

      throw new NotFoundException(`Could not find ${entityName} with id ${id}`)
    }

    return entity
  },
)
