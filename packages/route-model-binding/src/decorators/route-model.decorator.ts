import { createParamDecorator, type ExecutionContext } from "@nestjs/common"

/**
 * Parameter decorator that retrieves a model instance that was automatically
 * resolved from a route parameter by the RouteModelBindingMiddleware.
 *
 * @param data - The name of the route parameter (without the colon).
 *               For example, for route "/users/:user", use "user".
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
    return req.routeModels[data]
  },
)
