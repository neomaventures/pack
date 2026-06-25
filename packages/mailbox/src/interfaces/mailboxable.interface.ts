/**
 * Interface that must be implemented by any entity representing a
 * mailbox connection — the binding between the host's authenticated
 * principal and a single Gmail address mailbox can read from.
 *
 * The reference implementation is {@link MailAccount}, shipped from
 * `@neomaventures/mailbox/entities`. Consumers who need extra columns
 * (display name, sync cursors, etc.) declare their own entity that
 * implements this interface and pass it via `MailboxOptions.entity`.
 *
 * `accountId` is intentionally a loose FK string — mailbox does not
 * own the principal entity, so it does not declare a TypeORM relation.
 * The host's adapter is responsible for resolving `accountId` back to
 * its principal type when needed.
 *
 * @example
 * ```typescript
 * import { Mailboxable } from "@neomaventures/mailbox"
 * import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"
 *
 * @Entity()
 * class CustomMailAccount implements Mailboxable {
 *   @PrimaryGeneratedColumn("uuid")
 *   public id!: string
 *
 *   @Column()
 *   public accountId!: string
 *
 *   @Column()
 *   public gmailAddress!: string
 *
 *   @Column({ nullable: true })
 *   public displayName?: string
 * }
 * ```
 */
export interface Mailboxable {
  /**
   * Primary key. Typed as `any` so consumers may use uuid, integer, or
   * string keys without coupling mailbox to a single key strategy.
   */
  id: any

  /**
   * Loose FK to the host's authenticated principal. Stored as a string
   * regardless of the host principal's underlying key type — mailbox
   * does not declare a TypeORM relation here.
   */
  accountId: string

  /**
   * The Gmail address this mailbox connection represents. Stored as
   * provided by the OAuth profile; lowercase normalisation is the
   * host's call.
   */
  gmailAddress: string
}
