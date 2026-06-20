import { type Storable } from "@neomaventures/storage"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

/**
 * Represents a file uploaded via `@neomaventures/storage`.
 *
 * Implements {@link Storable} so the storage interceptor can persist
 * file metadata after a successful S3 upload. Each row records the
 * S3 object key, bucket, and the original client-side filename.
 *
 * @example
 * ```typescript
 * const upload = repository.create({
 *   originalName: "avatar.png",
 *   mimeType: "image/png",
 *   size: 1024,
 *   key: "01J0...-avatar.png",
 *   bucket: "avatars",
 * })
 * await repository.save(upload)
 * ```
 */
@Entity()
export class Upload implements Storable {
  /** UUID primary key, auto-generated on insert. */
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  /** Original filename as provided by the client. */
  @Column()
  public originalName!: string

  /** MIME type detected from the upload. */
  @Column()
  public mimeType!: string

  /** Size of the uploaded file in bytes. */
  @Column()
  public size!: number

  /** Object key under which the file is stored in S3. */
  @Column()
  public key!: string

  /** Bucket the file is stored in. */
  @Column()
  public bucket!: string
}
