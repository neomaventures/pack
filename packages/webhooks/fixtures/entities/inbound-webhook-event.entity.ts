import { type WebhookEventEntity } from "@neomaventures/webhooks"
import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm"

/**
 * Test entity implementing {@link WebhookEventEntity} for e2e specs.
 */
@Entity()
@Unique(["provider", "externalId"])
export class InboundWebhookEvent implements WebhookEventEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @Column()
  public provider!: string

  @Column()
  public externalId!: string

  @Column()
  public receivedAt!: Date
}
