import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

import { type Mailboxable } from "../../src/interfaces/mailboxable.interface"

/**
 * Test entity implementing {@link Mailboxable} for unit and e2e specs in
 * the mailbox package. Stands in for a consumer-supplied custom entity
 * passed via `MailboxOptions.entity` — use this instead of declaring an
 * ad-hoc `TestMailAccount` inside each spec.
 */
@Entity()
export class TestMailboxable implements Mailboxable {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @Column()
  public accountId!: string

  @Column()
  public gmailAddress!: string
}
