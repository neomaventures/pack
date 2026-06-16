import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"

import { type AuthenticatableProfile } from "../types/auth-profile.type"
import { type OAuthProvider } from "../types/oauth-provider.type"
import { type OAuthTokenSnapshot } from "../types/oauth-token-snapshot.type"

import { OAuthToken } from "./oauth-token.entity"

/**
 * Concrete identity entity owned by `@neomaventures/auth`. Replaces the
 * `Authenticatable` / `OAuthAuthenticatable` interfaces — consumers
 * register `Account` directly via `TypeOrmModule.forFeature([Account])`
 * rather than implementing an interface on their own entity class.
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
 * public count(@CurrentAccount() account: Account): unknown {
 *   const token = account.activeToken("google")
 *   if (!token) return { count: 0 }
 *   return this.gmail.count(token.accessToken)
 * }
 * ```
 */
@Entity({ name: "account" })
export class Account {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @Column({ unique: true })
  public email!: string

  @Column("simple-array", { default: "" })
  public permissions!: string[]

  @Column("simple-json", { nullable: true })
  public authProfile?: AuthenticatableProfile | null

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
    const tokens = this.oauthTokens
    if (!tokens || tokens.length === 0) {
      return null
    }

    const match = tokens.find(
      (token: OAuthToken): boolean => token.provider === provider,
    )
    if (!match) {
      return null
    }

    const expiresAt =
      match.expiresAt instanceof Date
        ? match.expiresAt
        : new Date(match.expiresAt)
    if (expiresAt.getTime() <= Date.now()) {
      return null
    }

    return {
      accessToken: match.accessToken,
      expiresAt,
      scopes: match.scopes,
    }
  }
}
