import { type OAuthTokenable } from "@neomaventures/auth"
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm"

import { User } from "./user.entity"

@Entity()
@Unique(["principal", "provider"])
export class OAuthToken implements OAuthTokenable {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @ManyToOne(() => User)
  public principal!: User

  @Column()
  public provider!: string

  @Column()
  public accessToken!: string

  @Column({ type: "text", nullable: true })
  public refreshToken!: string | null

  @Column()
  public expiresAt!: Date

  @Column("simple-array")
  public scopes!: string[]
}
