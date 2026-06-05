import {
  createParamDecorator,
  type ExecutionContext,
  NotFoundException,
} from "@nestjs/common"

/**
 * Parameter decorator that retrieves a model instance that was automatically
 * resolved from a route parameter by the RouteModelBindingMiddleware.
 *
 * If the resolved model is `null` (i.e. the entity was not found in the
 * database), this decorator throws a {@link NotFoundException} using
 * metadata from `req.routeModelMeta` to produce a meaningful error message.
 *
 * @param data - The name of the route parameter (without the colon).
 *               For example, for route "/users/:user", use "user".
 *
 * @throws {NotFoundException} When the resolved model is `null` or
 *   `undefined`, indicating the entity was not found in the database.
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
  (data: any, context: ExecutionContext): any => {
    const req = context.switchToHttp().getRequest()
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
