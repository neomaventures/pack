import { type Request } from "express"
import { type FindOptionsWhere } from "typeorm"

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
}
