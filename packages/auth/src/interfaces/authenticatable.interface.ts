import { type OAuthProfile } from "../types/oauth-profile.type"

import { type OAuthTokenable } from "./oauth-tokenable.interface"

/**
 * Interface that must be implemented by any entity that can be authenticated.
 *
 * Covers both local credentials (email + magic link) and third-party sign-in
 * (e.g. Google), with optional `oauthTokens` for entities that want OAuth
 * tokens captured during third-party sign-in eagerly loaded as a navigation
 * array.
 *
 * @example
 * ```typescript
 * import { Authenticatable } from '@neomaventures/auth'
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
   * `null` is permitted because TypeORM hydrates a missing JSON column as
   * `null` rather than `undefined`.
   */
  authProfile?: OAuthProfile | null

  /**
   * Persisted OAuth tokens, one entry per provider, exposed via a
   * `@OneToMany` relation. Tokens live in a separate `oauth_token` table
   * (one row per `(account, provider)`) rather than an in-row JSON column
   * so FK constraints, per-provider upserts, and per-column types
   * (`timestamptz`, `text`) stay native database concerns. Optional so
   * consumers who don't use OAuth — or who use it purely for sign-in with
   * no API calls — don't need the relation. `undefined` when no
   * third-party sign-in has happened yet and the relation has not been
   * hydrated.
   */
  oauthTokens?: OAuthTokenable[]
}
