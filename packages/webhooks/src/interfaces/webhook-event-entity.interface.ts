/**
 * Contract that consumer entities must implement to support webhook
 * deduplication via `@WebhookHandler()`.
 *
 * The consumer owns the entity, the migration, and the table. The package
 * only requires these four columns to exist.
 *
 * **Important:** The entity must enforce a `UNIQUE(provider, externalId)`
 * constraint for dedup to work correctly.
 *
 * @example
 * ```typescript
 * @Entity()
 * @Unique(["provider", "externalId"])
 * export class InboundWebhookEvent implements WebhookEventEntity {
 *   @PrimaryGeneratedColumn("uuid")
 *   public id: string
 *
 *   @Column()
 *   public provider: string
 *
 *   @Column()
 *   public externalId: string
 *
 *   @Column()
 *   public receivedAt: Date
 * }
 * ```
 */
export interface WebhookEventEntity {
  /** Primary key -- consumer's choice (uuid, ulid, etc.) */
  id: string
  /** Webhook source identifier, set by `@WebhookHandler("resend")` */
  provider: string
  /** Provider's event ID, extracted from the `svix-id` header */
  externalId: string
  /** Timestamp of first receipt */
  receivedAt: Date
}
