/**
 * Provider-specific profile data stored on the authenticatable entity.
 *
 * Each key is a provider name (e.g., `"google"`) mapping to a record of
 * provider-specific claims. The `google` key has a well-known shape.
 *
 * @example
 * ```typescript
 * const profile: AuthenticatableProfile = {
 *   google: { sub: "1234567890", name: "Alice", picture: "https://..." },
 * }
 * ```
 */
export interface AuthenticatableProfile {
  /** Google OAuth profile claims */
  google?: { sub: string; name?: string; picture?: string }
  /** Additional provider profiles */
  [provider: string]: Record<string, any> | undefined
}

/**
 * Interface that must be implemented by any entity that can be authenticated.
 *
 * @example
 * ```typescript
 * import { Authenticatable } from '@neoma/garmr'
 *
 * @Entity()
 * class User implements Authenticatable {
 *   @PrimaryGeneratedColumn('uuid')
 *   public id: string
 *
 *   @Column({ unique: true })
 *   public email: string
 * }
 * ```
 */
export interface Authenticatable {
  /**
   * Unique identifier for the entity.
   */
  id: any

  /**
   * Email address used for authentication.
   * Should be stored as lowercase for case-insensitive lookups.
   * Add a unique constraint on this column.
   */
  email: string

  /**
   * Optional array of permission strings for authorization.
   * Format: `action:resource` (e.g., `read:users`, `write:articles`).
   * Supports wildcards: `*` (all permissions), `*:resource`, `action:*`.
   */
  permissions?: string[]

  /**
   * Optional provider-specific profile data (e.g., Google OAuth claims).
   */
  authProfile?: AuthenticatableProfile
}
