import {
  type AuthenticatableProfile,
  type OAuthAuthenticatable,
} from "@neomaventures/auth"
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm"

import { OAuthToken } from "~auth/oauth-token.entity"
import { Upload } from "~auth/upload.entity"

/**
 * Represents an authenticated account in the application.
 *
 * Implements {@link OAuthAuthenticatable} so that `@neomaventures/auth`
 * can resolve, create, and authorise accounts via magic-link or OAuth
 * flows and read the eagerly-loaded `oauthTokens` relation through the
 * `OAuthTokenService` and `@OAuthToken()` decorator.
 *
 * @example
 * ```typescript
 * const account = repository.create({ email: "alice@example.com" })
 * await repository.save(account)
 * ```
 */
@Entity()
export class Account implements OAuthAuthenticatable {
  /** UUID primary key, auto-generated on insert. */
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  /** Unique email address used for authentication. */
  @Column({ unique: true })
  public email!: string

  /**
   * Permission strings for authorisation.
   * Defaults to an empty array when not provided.
   *
   * @example `["read:articles", "write:articles"]`
   */
  @Column("simple-array", { default: "" })
  public permissions!: string[]

  /** Optional provider-specific profile data (e.g. Google OAuth claims). */
  @Column("simple-json", { nullable: true })
  public authProfile?: AuthenticatableProfile

  /**
   * Persisted OAuth tokens captured during third-party sign-in.
   * Eagerly loaded so that `OAuthTokenService.getActiveToken()` and the
   * `@OAuthToken()` parameter decorator can resolve from the principal
   * without an extra query.
   */
  @OneToMany(() => OAuthToken, (token) => token.principal, {
    eager: true,
    cascade: false,
  })
  public oauthTokens?: OAuthToken[]

  /**
   * The account holder's avatar image, or `null` when no avatar has been
   * set. Eagerly loaded on every Account query — the JOIN is cheap (single
   * UUID FK) and templates can access `account.avatar` directly without
   * threading `relations: ['avatar']` through every callsite.
   *
   * Switch to explicit `relations: ['avatar']` per-query if the eager JOIN
   * ever shows up in a profile.
   */
  @OneToOne(() => Upload, { eager: true, nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "avatarUploadId" })
  public avatar?: Upload | null
}
