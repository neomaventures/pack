import { type Type } from "@nestjs/common"

import { type WebhookEventEntity } from "./interfaces/webhook-event-entity.interface"

/**
 * DI token for injecting the webhooks module options.
 *
 * Used by {@link WebhookSignatureGuard} internally and available to consumers
 * who need programmatic access to the options (e.g. custom guards).
 *
 * @example
 * ```typescript
 * @Inject(WEBHOOKS_OPTIONS) private readonly options: WebhooksOptions
 * ```
 */
export const WEBHOOKS_OPTIONS = Symbol("WEBHOOKS_OPTIONS")

/**
 * Configuration options for the webhooks module.
 *
 * @example
 * ```typescript
 * WebhooksModule.forRoot({
 *   secret: "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
 *   entity: InboundWebhookEvent,
 * })
 * ```
 */
export interface WebhooksOptions {
  /**
   * The webhook signing secret in Svix format: `whsec_` prefix followed
   * by a base64-encoded key.
   *
   * @example "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"
   */
  secret: string

  /**
   * The entity class implementing {@link WebhookEventEntity} used for
   * webhook event persistence and deduplication.
   *
   * The entity **must** enforce a `UNIQUE(provider, externalId)` constraint
   * for dedup to work correctly.
   *
   * @example InboundWebhookEvent
   */
  entity: Type<WebhookEventEntity>
}
