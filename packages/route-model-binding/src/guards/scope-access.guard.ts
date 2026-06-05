import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common"
import type { Request } from "express"

import {
  ROUTE_MODEL_BINDING_CONFIG,
  SCOPE_ACCESSOR,
} from "../constants/injection-tokens"
import { type RouteModelBindingConfig } from "../interfaces/route-model-binding-config.interface"
import { type ScopeAccessor } from "../interfaces/scope-accessor.interface"

/**
 * Guard that enforces post-load entity scoping.
 *
 * After the {@link RouteModelBindingMiddleware} resolves entities and
 * stores them on `req.routeModels`, this guard iterates each entry and
 * calls the configured {@link ScopeAccessor}'s `canAccess` method. If
 * any check fails, the guard throws a `NotFoundException` (default) or
 * `ForbiddenException` depending on the `deny` setting.
 *
 * Running the check in a guard (rather than middleware) ensures the
 * exception flows through the controller's decorator chain, so
 * controller-scoped exception filters and interceptors can intercept it.
 *
 * @internal Registered globally via `APP_GUARD` when scope is configured.
 */
@Injectable()
export class ScopeAccessGuard implements CanActivate {
  public constructor(
    @Optional()
    @Inject(SCOPE_ACCESSOR)
    private readonly scopeAccessor?: ScopeAccessor,
    @Optional()
    @Inject(ROUTE_MODEL_BINDING_CONFIG)
    private readonly config?: RouteModelBindingConfig,
  ) {}

  /**
   * Checks whether the current request context is allowed to access
   * each resolved route model entity.
   *
   * Entities that resolved to `null` (i.e. not found in the database)
   * are skipped — the downstream `@RouteModel()` decorator is
   * responsible for throwing `NotFoundException` for missing entities.
   *
   * @param context - The current execution context
   * @returns `true` if all entities are accessible
   * @throws {NotFoundException} When `canAccess` returns `false` and
   *   `deny` is `404` (default)
   * @throws {ForbiddenException} When `canAccess` returns `false` and
   *   `deny` is `403`
   */
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.scopeAccessor) {
      return true
    }

    const req = context.switchToHttp().getRequest<Request>()
    const models = req.routeModels
    const meta = req.routeModelMeta

    if (!models || !meta) {
      return true
    }

    for (const [name, entity] of Object.entries(models)) {
      if (entity == null) {
        continue
      }

      const { id, entityName } = meta[name]

      const allowed = await this.scopeAccessor.canAccess({
        entity,
        id,
        name,
        req,
      })

      if (!allowed) {
        const deny = this.config?.scope?.deny ?? 404

        if (deny === 403) {
          throw new ForbiddenException(
            `Access denied to ${entityName} with id ${id}`,
          )
        }

        throw new NotFoundException(
          `Could not find ${entityName} with id ${id}`,
        )
      }
    }

    return true
  }
}
