import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

import { type Mailboxable } from "../interfaces/mailboxable.interface"

/**
 * Concrete mailbox-connection entity owned by `@neomaventures/mailbox`.
 * Reference implementation of {@link Mailboxable} — consumers register
 * `MailAccount` directly via `TypeOrmModule.forFeature([MailAccount])`
 * rather than rolling their own entity class.
 *
 * Custom fields belong on a separate consumer-owned entity that
 * implements `Mailboxable` and is wired via `MailboxOptions.entity`,
 * not by extending this class. TypeORM single-table inheritance is
 * explicitly unsupported.
 *
 * v0.1.0 is intentionally slim — no `createdAt` / `updatedAt`. Those
 * land when a writer needs them.
 *
 * @example Registering with TypeORM
 * ```typescript
 * import { MailAccount } from "@neomaventures/mailbox/entities"
 * import { TypeOrmModule } from "@nestjs/typeorm"
 *
 * @Module({
 *   imports: [TypeOrmModule.forFeature([MailAccount])],
 * })
 * export class AppModule {}
 * ```
 */
@Entity({ name: "mail_account" })
export class MailAccount implements Mailboxable {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @Column()
  public accountId!: string

  @Column()
  public gmailAddress!: string
}
