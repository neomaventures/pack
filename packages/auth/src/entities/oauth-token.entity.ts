import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from "typeorm"

import { Account } from "./account.entity"

/**
 * Concrete OAuth-token entity owned by `@neomaventures/auth`. One row
 * per `(account, provider)` pair — the unique index enforces the
 * invariant, and `GoogleAuthService.persistOAuthToken` upserts on it.
 *
 * The `account` navigation is a `@ManyToOne` to {@link Account}; TypeORM
 * derives the `accountId` FK column from the property name. `Relation<T>`
 * defers the type reference at runtime to avoid the circular-import
 * footgun between `Account` and `OAuthToken`.
 *
 * `refreshToken` is `null` when Google omitted `refresh_token` from the
 * most recent code exchange AND no prior token was on file. After the
 * first consent Google does not return a refresh token on subsequent
 * logins, so the persisted value is sticky once captured.
 *
 * @example
 * ```typescript
 * import { OAuthToken } from "@neomaventures/auth"
 * import { TypeOrmModule } from "@nestjs/typeorm"
 *
 * @Module({
 *   imports: [TypeOrmModule.forFeature([OAuthToken])],
 * })
 * export class AppModule {}
 * ```
 */
@Entity({ name: "oauth_token" })
@Index(["account", "provider"], { unique: true })
export class OAuthToken {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @ManyToOne(() => Account)
  public account!: Relation<Account>

  @Column()
  public provider!: string

  @Column()
  public accessToken!: string

  @Column({ type: "text", nullable: true })
  public refreshToken!: string | null

  @Column({ type: Date })
  public expiresAt!: Date

  @Column("simple-array")
  public scopes!: string[]
}
