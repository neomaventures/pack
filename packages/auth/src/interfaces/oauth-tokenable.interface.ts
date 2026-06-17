import { type Authenticatable } from "./authenticatable.interface"

/**
 * Contract that a consumer's OAuth-token entity must satisfy so that
 * `@neomaventures/auth` can persist tokens captured during third-party
 * sign-in.
 *
 * One row per `(account, provider)` pair — `GoogleAuthService` upserts
 * the row keyed on the `account` navigation and the `provider` string
 * whenever a code exchange succeeds.
 *
 * `account` is a TypeORM navigation property — consumers declare it as
 * a `@ManyToOne` relation to their `Authenticatable` entity. TypeORM
 * derives the FK column name (`accountId`) from the property name.
 *
 * `refreshToken` is `null` when Google omitted `refresh_token` from the
 * most recent code exchange AND no prior token was on file. After the
 * first consent Google does not return a refresh token on subsequent
 * logins, so the persisted value is sticky once captured.
 *
 * @example
 * ```typescript
 * import { OAuthTokenable, Authenticatable } from "@neomaventures/auth"
 * import {
 *   Column,
 *   Entity,
 *   ManyToOne,
 *   PrimaryGeneratedColumn,
 * } from "typeorm"
 *
 * @Entity()
 * export class OAuthToken implements OAuthTokenable {
 *   @PrimaryGeneratedColumn("uuid")
 *   public id!: string
 *
 *   @ManyToOne(() => Account)
 *   public account!: Account
 *
 *   @Column()
 *   public provider!: string
 *
 *   @Column()
 *   public accessToken!: string
 *
 *   @Column({ type: "text", nullable: true })
 *   public refreshToken!: string | null
 *
 *   @Column({ type: "timestamptz" })
 *   public expiresAt!: Date
 *
 *   @Column("simple-array")
 *   public scopes!: string[]
 * }
 * ```
 */
export interface OAuthTokenable {
  /** Primary key. Type is `any` so consumers can pick uuid, bigint, etc. */
  id: any
  /**
   * Navigation property pointing back at the account that owns this
   * token. Consumers declare this as a `@ManyToOne` relation; TypeORM
   * derives the FK column name (`accountId`) automatically.
   */
  account: Authenticatable
  /** The OAuth provider this token belongs to (e.g. `"google"`). */
  provider: string
  /** The current access token issued by the provider. */
  accessToken: string
  /**
   * The refresh token issued by the provider, or `null` when none has
   * been captured yet.
   */
  refreshToken: string | null
  /** Absolute expiry of the access token. */
  expiresAt: Date
  /** OAuth scopes granted by the user at consent time. */
  scopes: string[]
}
