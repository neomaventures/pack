import { type Request } from "express"

/**
 * Context provided to a {@link ScopeAccessor} after an entity has been
 * resolved from a route parameter.
 *
 * @property entity - The resolved entity instance
 * @property name - The route parameter name (e.g. "user", "post")
 * @property id - The route parameter value
 * @property req - The Express request object
 */
export interface ScopeContext {
  /** The resolved entity instance. */
  entity: unknown
  /** The route parameter name (e.g. "user", "post"). */
  name: string
  /** The route parameter value. */
  id: string
  /** The Express request object. */
  req: Request
}

/**
 * Post-load scoping hook for route-model-binding.
 *
 * After an entity is resolved from the database, the scope guard calls
 * `canAccess` to determine whether the current context (principal, tenant,
 * etc.) is allowed to access the entity. The accessor is a pure check — it
 * does not throw or decide which HTTP status results from denial.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class TenantScopeAccessor implements ScopeAccessor {
 *   public canAccess({ entity, req }: ScopeContext): boolean {
 *     return (entity as Tenanted).tenantId === req.tenantId
 *   }
 * }
 * ```
 */
export interface ScopeAccessor {
  /**
   * Determines whether the current context is allowed to access the
   * resolved entity.
   *
   * @param context - The scope context containing the entity, parameter
   *   name, parameter value, and request object
   * @returns `true` if access is allowed, `false` otherwise. May return
   *   a `Promise<boolean>` for async checks (e.g. database lookups).
   */
  canAccess(context: ScopeContext): boolean | Promise<boolean>
}
