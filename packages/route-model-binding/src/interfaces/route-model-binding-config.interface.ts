import { type Type } from "@nestjs/common"
import { type Request } from "express"
import { type FindOptionsWhere } from "typeorm"

import { type ScopeAccessor } from "./scope-accessor.interface"

/**
 * Context provided to resolver functions containing all information
 * needed to construct a database query for route model binding.
 *
 * @property name The name of the route parameter being resolved (e.g., 'user', 'post')
 * @property id The value of the route parameter (e.g., the ID or slug)
 * @property req The Express request object
 */
export interface ResolverContext {
  /** The name of the route parameter being resolved (e.g., 'user', 'post') */
  name: string
  /** The value of the route parameter (e.g., the ID or slug) */
  id: string
  /** The Express request object */
  req: Request
}

/**
 * Function that generates a TypeORM where clause for finding an entity.
 * Can return the where clause synchronously or as a Promise.
 */
export type ResolverFunction = (
  context: ResolverContext,
) => FindOptionsWhere<any> | Promise<FindOptionsWhere<any>>

/**
 * Configuration for the optional post-load scoping mechanism.
 *
 * @example
 * ```typescript
 * scope: {
 *   accessor: TenantScopeAccessor,
 *   deny: 403,
 * }
 * ```
 */
export interface ScopeConfig {
  /**
   * Class implementing {@link ScopeAccessor}, resolved via DI (`useClass`).
   * The accessor is called after each entity is resolved to determine
   * whether the current context may access it.
   */
  accessor: Type<ScopeAccessor>

  /**
   * HTTP status code to return when `canAccess` returns `false`.
   *
   * - `404` — hides entity existence (default)
   * - `403` — reveals entity exists but access is denied
   *
   * @default 404
   */
  deny?: 404 | 403
}

/**
 * Configuration options for the RouteModelBinding module.
 */
export interface RouteModelBindingConfig {
  /**
   * Default resolver function applied to all route parameters
   * unless overridden by a specific resolver.
   *
   * @example
   * defaultResolver: ({ id }) => ({ id, deletedAt: null })
   */
  defaultResolver: ResolverFunction

  /**
   * Optional mapping of specific route parameters to custom resolver functions.
   * These functions override the default resolver for their respective parameters.
   *
   * @example
   * paramResolvers: {
   *   user: ({ id }) => ({ id, isActive: true }),
   *   post: async ({ id, req }) => {
   *     const post = await someAsyncCheck(id, req)
   *     return { id: post.id }
   *   }
   * }
   */
  paramResolvers?: {
    [paramName: string]: ResolverFunction
  }

  /**
   * Optional post-load scoping configuration. When provided, a
   * {@link ScopeAccessor} is called after each entity is resolved to
   * determine whether the current context may access it.
   *
   * @example
   * ```typescript
   * scope: {
   *   accessor: TenantScopeAccessor,
   *   deny: 404,
   * }
   * ```
   */
  scope?: ScopeConfig
}
