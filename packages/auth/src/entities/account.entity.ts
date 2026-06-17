import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"

import { type OAuthAuthenticatable } from "../interfaces/oauth-authenticatable.interface"
import { OAuthTokenService } from "../services/oauth-token.service"
import { type OAuthProfile } from "../types/oauth-profile.type"
import { type OAuthProvider } from "../types/oauth-provider.type"
import { type OAuthTokenSnapshot } from "../types/oauth-token-snapshot.type"

import { OAuthToken } from "./oauth-token.entity"

/**
 * Concrete identity entity owned by `@neomaventures/auth`. The reference
 * implementation of the `Authenticatable` / `OAuthAuthenticatable`
 * interfaces — consumers register `Account` directly via
 * `TypeOrmModule.forFeature([Account])` rather than rolling their own
 * entity class.
 *
 * Custom fields belong on a separate consumer-owned entity with a FK to
 * `Account` (e.g. `Profile.@OneToOne(() => Account)`), not by extending
 * this class. TypeORM single-table inheritance is explicitly unsupported.
 *
 * @example Registering with TypeORM
 * ```typescript
 * import { Account, OAuthToken } from "@neomaventures/auth"
 * import { TypeOrmModule } from "@nestjs/typeorm"
 *
 * @Module({
 *   imports: [TypeOrmModule.forFeature([Account, OAuthToken])],
 * })
 * export class AppModule {}
 * ```
 *
 * @example Reading the active Google token in a controller
 * ```typescript
 * @Get("inbox/count")
 * @Authenticated()
 * public count(@AuthenticatedAccount() account: Account): unknown {
 *   const token = account.activeToken("google")
 *   if (!token) return { count: 0 }
 *   return this.gmail.count(token.accessToken)
 * }
 * ```
 */
@Entity({ name: "account" })
export class Account implements OAuthAuthenticatable {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @Column({ unique: true })
  public email!: string

  @Column("simple-array", { default: "" })
  public permissions!: string[]

  @Column("simple-json", { nullable: true })
  public authProfile?: OAuthProfile | null

  @CreateDateColumn()
  public createdAt!: Date

  @UpdateDateColumn()
  public updatedAt!: Date

  @OneToMany(() => OAuthToken, (t) => t.account, { eager: true })
  public oauthTokens?: OAuthToken[]

  /**
   * Returns the active OAuth token snapshot for the given provider, or
   * `null` when no non-expired token is on file.
   *
   * Defensive about `expiresAt` typing — TypeORM normally hydrates it as
   * a `Date`, but JSON-serialised rows (e.g. cached responses or test
   * fixtures) can arrive as ISO strings. Both shapes are accepted and
   * the snapshot's `expiresAt` is always a `Date`.
   *
   * @param provider - The OAuth provider key (e.g. `"google"`).
   * @returns A snapshot with `accessToken`, `expiresAt`, `scopes`, or
   *   `null` when no token exists for the provider or the stored token
   *   has expired.
   *
   * @example
   * ```typescript
   * const token = account.activeToken("google")
   * if (token) {
   *   await fetch(url, { headers: { Authorization: `Bearer ${token.accessToken}` } })
   * }
   * ```
   */
  public activeToken(provider: OAuthProvider): OAuthTokenSnapshot | null {
    return OAuthTokenService.getActiveToken(this, provider)
  }
}
