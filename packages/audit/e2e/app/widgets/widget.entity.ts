import { CreatedBy, UpdatedBy } from "@neomaventures/audit"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class Widget {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @Column()
  public name!: string

  @CreatedBy()
  public createdBy!: string

  @UpdatedBy()
  public updatedBy!: string
}
