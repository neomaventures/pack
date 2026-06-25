import { Inject, type NestMiddleware, NotFoundException } from "@nestjs/common"
import { InjectDataSource } from "@nestjs/typeorm"
import { NextFunction, Request, Response } from "express"
import { DataSource } from "typeorm"

import { ROUTE_MODEL_BINDING_CONFIG } from "../constants/injection-tokens"
import {
  type ResolverFunction,
  type RouteModelBindingConfig,
} from "../interfaces/route-model-binding-config.interface"

/**
 * The key under which route models are stored in the request object.
 */
const STORAGE_KEY = "routeModels"

/**
 * Middleware that binds route parameters to model instances by taking
 * the value of the parameter and looking up the corresponding model
 * in the database. If found, the model instance is assigned to
 * `req.routeModels` under the same key as the route parameter.
 *
 * If an entity cannot be resolved, the middleware throws
 * {@link NotFoundException} directly — the request never reaches the
 * controller. The HTTP response is NestJS's standard 404 shape
 * (`{ statusCode: 404, message, error: "Not Found" }`); pair with
 * `ExceptionHandlerModule.forRoot({ errorTemplates: { NotFoundException: "..." } })`
 * from `@neomaventures/exceptions` to render a custom 404 view.
 *
 * Metadata for each successfully resolved entity (id and entity name)
 * is stored on `req.routeModelMeta` so that downstream guards can
 * produce meaningful error messages without re-querying the datasource.
 */
export class RouteModelBindingMiddleware implements NestMiddleware {
  /**
   * Creates an instance of RouteModelBindingMiddleware.
   *
   * @param ds The data source to use for database operations.
   * @param config Configuration for route model binding behavior.
   */
  public constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @Inject(ROUTE_MODEL_BINDING_CONFIG)
    private readonly config: RouteModelBindingConfig & {
      defaultResolver: ResolverFunction
    },
  ) {}

  /**
   * Middleware function to bind route parameters to model instances.
   *
   * Loops over all `req.params` and attempts to find a corresponding model
   * instance in the database. On success, the instance is assigned to
   * `req.routeModels[name]` and metadata (`id`, `entityName`) is populated on
   * `req.routeModelMeta[name]`, then `next()` is called.
   *
   * If the entity cannot be resolved, this method throws
   * {@link NotFoundException} directly: `next()` is not invoked, and
   * `req.routeModels[name]` / `req.routeModelMeta[name]` are not populated
   * for that parameter.
   *
   * @throws {@link NotFoundException} when a route parameter resolves no entity.
   * @throws Error if a route parameter id is not valid.
   * @throws Error if the repository for a route parameter cannot be found.
   *
   * @param req The incoming request object.
   * @param _res The outgoing response object (not used).
   * @param next The next middleware function in the stack.
   */
  public async use(
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const routeModelNames = Object.keys(req.params)

    const models = (req[STORAGE_KEY] ??= {})
    const meta = (req.routeModelMeta ??= {})

    for (const name of routeModelNames) {
      const lowerName = name.toLowerCase()
      const repo = this.ds.getRepository(lowerName)
      // Express 5 types route params as `string | string[]`; route model
      // binding resolves a single value, so take the first if it's repeated.
      const rawId = req.params[name]
      const id = Array.isArray(rawId) ? rawId[0] : rawId

      if (!id) {
        throw new Error(
          `InvalidArgumentError: The id for ${repo.metadata.name} is not valid`,
        )
      }

      const resolver =
        this.config.paramResolvers?.[lowerName] ?? this.config.defaultResolver

      const entity = await repo.findOne({
        where: await resolver({
          id,
          req,
          name,
        }),
      })

      if (!entity) {
        throw new NotFoundException(
          `Could not find ${repo.metadata.name} with id ${id}`,
        )
      }

      models[name] = entity
      meta[name] = { id, entityName: repo.metadata.name }
    }

    next()
  }
}
