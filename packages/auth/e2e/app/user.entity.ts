import { Authenticatable, AuthenticatableProfile } from "@neomaventures/auth"
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class User implements Authenticatable {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @Column({ unique: true })
  public email!: string

  @Column("simple-array", { default: "" })
  public permissions!: string[]

  @Column("simple-json", { nullable: true })
  public authProfile?: AuthenticatableProfile
}
