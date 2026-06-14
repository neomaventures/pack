import { type Authenticatable } from "./authenticatable.interface"
import { type OAuthTokenable } from "./oauth-tokenable.interface"

/**
 * Extension of {@link Authenticatable} for entities that want OAuth
 * tokens captured during third-party sign-in (e.g. Google) eagerly
 * loaded as a navigation array.
 *
 * Tokens live in a separate `oauth_token` table — one row per
 * `(principal, provider)` pair — and the principal exposes them via a
 * `@OneToMany` relation. This is a relational store rather than an
 * in-row JSON column because:
 *
 * - Tokens are referenced by FK constraints from related tables
 *   (audit logs, integration jobs) without parsing JSON.
 * - Per-provider upserts run as single-row writes on a narrow table
 *   instead of full-row UPDATEs on the principal.
 * - Indexes (`(principalId, provider)`) and per-column types
 *   (`timestamptz`, `text`) are native database concerns again.
 *
 * The field is optional so that consumers who don't use OAuth (or who
 * use Google purely for sign-in, with no API calls) don't need the
 * relation.
 *
 * @example
 * ```typescript
 * import { OAuthAuthenticatable } from "@neomaventures/auth"
 * import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm"
 *
 * import { OAuthToken } from "./oauth-token.entity"
 *
 * @Entity()
 * export class Account implements OAuthAuthenticatable {
 *   @PrimaryGeneratedColumn("uuid")
 *   public id!: string
 *
 *   @Column({ unique: true })
 *   public email!: string
 *
 *   @OneToMany(() => OAuthToken, (t) => t.principal, {
 *     eager: true,
 *     cascade: false,
 *   })
 *   public oauthTokens?: OAuthToken[]
 * }
 * ```
 */
export interface OAuthAuthenticatable extends Authenticatable {
  /**
   * Persisted OAuth tokens, one entry per provider. `undefined` when
   * no third-party sign-in has happened yet and the relation has not
   * been hydrated.
   */
  oauthTokens?: OAuthTokenable[]
}
