import { Account } from "@neomaventures/auth"
import { Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm"

import { Upload } from "~auth/upload.entity"

/**
 * Per-account profile customisation owned by the consumer app.
 *
 * Linked to {@link Account} by a one-to-one FK. Holds fields that don't
 * belong in the identity contract — display name, avatar reference —
 * which `@neomaventures/auth`'s `Account` deliberately leaves out.
 *
 * One row per account; the unique FK constraint enforces it. The
 * `avatar` relation is eagerly loaded because the avatar URL is read on
 * almost every authenticated page render.
 */
@Entity()
export class Profile {
  /** UUID primary key, auto-generated on insert. */
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  /**
   * The {@link Account} this profile belongs to. Unique FK — one profile
   * per account. `@JoinColumn()` marks this side as the FK owner; the
   * column name (`accountId`) is auto-derived by TypeORM from the
   * property name.
   */
  @OneToOne(() => Account)
  @JoinColumn()
  public account!: Account

  /**
   * The avatar image, or `null` when no avatar has been set. Eagerly
   * loaded — the JOIN is cheap (single UUID FK) and the avatar URL is
   * read on almost every authenticated page.
   */
  @OneToOne(() => Upload, { eager: true, nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "avatarUploadId" })
  public avatar?: Upload | null
}
