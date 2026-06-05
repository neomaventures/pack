import {
  ForbiddenException,
  Inject,
  NestMiddleware,
  NotFoundException,
  Optional,
} from "@nestjs/common"
import { InjectDataSource } from "@nestjs/typeorm"
import { NextFunction, Request, Response } from "express"
import { DataSource } from "typeorm"

import {
  ROUTE_MODEL_BINDING_CONFIG,
  SCOPE_ACCESSOR,
} from "../constants/injection-tokens"
import { RouteModelBindingConfig } from "../interfaces/route-model-binding-config.interface"
import { type ScopeAccessor } from "../interfaces/scope-accessor.interface"

/**
 * The key under which route models are stored in the request object.
 */
const STORAGE_KEY = "routeModels"

/**
 * Middleware that binds route parameters to model instances by taking
 * the value of the parameter and looking up the corresponding model
 * in the database. If found, the model instance is assigned to
 * req.routeModels under the same key as the route parameter.
 *
 * When a {@link ScopeAccessor} is configured, each resolved entity is
 * passed through `canAccess` before being stored. If the accessor denies
 * access, the middleware throws a `NotFoundException` (default) or
 * `ForbiddenException` depending on the `deny` setting.
 */
export class RouteModelBindingMiddleware implements NestMiddleware {
  /**
   * Creates an instance of RouteModelBindingMiddleware.
   *
   * @param ds The data source to use for database operations.
   * @param config Configuration for route model binding behavior.
   * @param scopeAccessor Optional scope accessor for post-load entity scoping.
   */
  public constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @Inject(ROUTE_MODEL_BINDING_CONFIG)
    private readonly config: Required<RouteModelBindingConfig>,
    @Optional()
    @Inject(SCOPE_ACCESSOR)
    private readonly scopeAccessor?: ScopeAccessor,
  ) {}

  /**
   * Middleware function to bind route parameters to model instances.
   *
   * Loops over all req.params and attempts to find a corresponding model instance
   * in the database. If found, it assigns the instance to req.routeModels under the
   * same key as the route parameter. If not found, it throws a NotFoundException.
   *
   * When a scope accessor is configured, `canAccess` is called after each
   * entity is resolved. If it returns `false`, the configured denial
   * exception is thrown.
   *
   * @throws NotFoundException if a model instance cannot be found for a route parameter.
   * @throws ForbiddenException if the scope accessor denies access with `deny: 403`.
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

      if (this.scopeAccessor) {
        const allowed = await this.scopeAccessor.canAccess({
          entity,
          id,
          name,
          req,
        })

        if (!allowed) {
          const deny = this.config.scope?.deny ?? 404

          if (deny === 403) {
            throw new ForbiddenException(
              `Access denied to ${repo.metadata.name} with id ${id}`,
            )
          }

          throw new NotFoundException(
            `Could not find ${repo.metadata.name} with id ${id}`,
          )
        }
      }

      models[name] = entity
    }

    next()
  }
}
