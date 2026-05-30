/**
 * Interface that consumer entities must implement to be used with Storage.
 *
 * Storage populates these fields automatically during the upload lifecycle.
 * Consumers may add additional columns to their entity beyond this interface.
 *
 * @example
 * ```typescript
 * @Entity()
 * export class Upload implements Storable {
 *   @PrimaryGeneratedColumn()
 *   id!: number
 *
 *   @Column()
 *   originalName!: string
 *
 *   @Column()
 *   mimeType!: string
 *
 *   @Column()
 *   size!: number
 *
 *   @Column()
 *   key!: string
 *
 *   @Column()
 *   bucket!: string
 * }
 * ```
 */
export interface Storable {
  /** Primary key — any type (number, string, uuid, etc.) */
  id: any
  /** Original filename as uploaded by the client */
  originalName: string
  /** MIME type of the uploaded file */
  mimeType: string
  /** File size in bytes */
  size: number
  /** S3 object key */
  key: string
  /** S3 bucket name */
  bucket: string
}
