import {
  type AuthenticatableProfile,
  type OAuthAuthenticatable,
} from "@neomaventures/auth"
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm"

import { OAuthToken } from "./oauth-token.entity"

/**
 * `User` implements {@link OAuthAuthenticatable} so the e2e suite exercises
 * the OAuth code paths (token persistence, eagerly-loaded `oauthTokens`,
 * `authProfile` writes from Google sign-in).
 *
 * `OAuthAuthenticatable` extends `Authenticatable` — so this same entity
 * also satisfies the plain `Authenticatable` contract. The non-OAuth code
 * paths (magic link, bearer-token, session cookie) work against `User`
 * without ever touching `oauthTokens`. Existing specs that cover those
 * paths against this entity:
 *
 * - `e2e/core/magic-link/post.e2e-spec.ts` — magic-link issue + verify
 * - `e2e/core/me/bearer/get.e2e-spec.ts` — bearer-token authentication
 *
 * Together they keep the plain-`Authenticatable` contract exercised even
 * though the entity here also carries the OAuth-specific columns.
 */
@Entity()
export class User implements OAuthAuthenticatable {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @Column({ unique: true })
  public email!: string

  @Column("simple-array", { default: "" })
  public permissions!: string[]

  @Column("simple-json", { nullable: true })
  public authProfile?: AuthenticatableProfile

  @OneToMany(() => OAuthToken, (t) => t.principal, {
    eager: true,
    cascade: false,
  })
  public oauthTokens?: OAuthToken[]
}
