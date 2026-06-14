import { type OAuthTokenable } from "@neomaventures/auth"
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm"

import type { Account } from "~auth/account.entity"

/**
 * Postgres uses `timestamptz` to align with the migration's
 * `TIMESTAMP WITH TIME ZONE`; SQLite (used by in-memory unit specs)
 * falls back to `datetime` since `timestamptz` is not a valid SQLite
 * column type.
 */
const expiresAtColumnType = process.env.DATABASE_URI?.startsWith("postgres")
  ? "timestamptz"
  : "datetime"

/**
 * OAuth token persisted by `@neomaventures/auth` whenever a third-party
 * code exchange succeeds. One row per `(principal, provider)` pair —
 * `GoogleAuthService` upserts the row keyed on the `principal` relation
 * and the `provider` string.
 *
 * The `principal` navigation is a `@ManyToOne` to `Account`; TypeORM
 * derives the `principalId` FK column from the property name.
 *
 * @example
 * ```typescript
 * const token = await repo.findOne({
 *   where: { principal: { id: account.id }, provider: "google" },
 * })
 * ```
 */
@Entity()
@Unique(["principal", "provider"])
export class OAuthToken implements OAuthTokenable {
  /** UUID primary key, auto-generated on insert. */
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  /**
   * The principal that owns this token row. Backed by the `principalId`
   * FK column (TypeORM-derived).
   */
  @ManyToOne("Account", { onDelete: "CASCADE" })
  public principal!: Account

  /** OAuth provider — e.g. `"google"`. */
  @Column()
  public provider!: string

  /** Current access token issued by the provider. */
  @Column()
  public accessToken!: string

  /**
   * Refresh token issued by the provider, or `null` when none has been
   * captured yet. Sticky once captured — Google omits `refresh_token`
   * on subsequent logins after the first consent.
   */
  @Column({ type: "text", nullable: true })
  public refreshToken!: string | null

  /**
   * Absolute expiry of the access token. Stored as a timezone-aware
   * timestamp in Postgres; downgraded to plain `datetime` in SQLite for
   * unit specs that exercise the entity against the in-memory driver.
   */
  @Column({ type: expiresAtColumnType })
  public expiresAt!: Date

  /** OAuth scopes granted by the user at consent time. */
  @Column("simple-array")
  public scopes!: string[]
}
