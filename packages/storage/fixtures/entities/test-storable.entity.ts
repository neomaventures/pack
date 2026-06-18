import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

import { type Storable } from "../../src/interfaces/storable.interface"

/**
 * Test entity implementing {@link Storable} for unit and e2e specs in the
 * storage package. Use this instead of declaring an ad-hoc `TestUpload`
 * inside each spec.
 */
@Entity()
export class TestStorable implements Storable {
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
}
