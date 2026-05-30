import { type Storable } from "@neomaventures/storage"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

/**
 * Demo entity implementing Storable for e2e testing.
 */
@Entity()
export class Upload implements Storable {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @Column()
  public originalName!: string

  @Column()
  public mimeType!: string

  @Column()
  public size!: number

  @Column()
  public key!: string

  @Column()
  public bucket!: string

  /** Extra column to test handler mutation persistence */
  @Column({ nullable: true })
  public source?: string
}
