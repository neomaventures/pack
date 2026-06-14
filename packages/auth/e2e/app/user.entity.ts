import {
  type AuthenticatableProfile,
  type OAuthAuthenticatable,
} from "@neomaventures/auth"
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm"

import { OAuthToken } from "./oauth-token.entity"

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
