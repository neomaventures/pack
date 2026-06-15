import { type OAuthTokenable } from "@neomaventures/auth"
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
} from "typeorm"

import { User } from "./user.entity"

@Entity()
@Unique(["principal", "provider"])
export class OAuthToken implements OAuthTokenable {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @ManyToOne(() => User)
  public principal!: Relation<User>

  @Column()
  public provider!: string

  @Column()
  public accessToken!: string

  @Column({ type: "text", nullable: true })
  public refreshToken!: string | null

  @Column({ type: "datetime" })
  public expiresAt!: Date

  @Column("simple-array")
  public scopes!: string[]
}
