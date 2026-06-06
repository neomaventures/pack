/**
 * Event emitted when a duplicate webhook is detected (same provider + externalId
 * already exists in the database).
 *
 * Consumers listen with `@OnEvent(WebhookDuplicateEvent.NAME)`.
 *
 * @example
 * ```typescript
 * @OnEvent(WebhookDuplicateEvent.NAME)
 * public onDuplicate(event: WebhookDuplicateEvent): void {
 *   console.log(`Duplicate webhook skipped: ${event.provider}/${event.id}`)
 * }
 * ```
 */
export class WebhookDuplicateEvent {
  public static readonly NAME = "webhook.duplicate"

  /**
   * The event name.
   *
   * Note: Will always match WebhookDuplicateEvent.NAME
   * if comparisons need to be made.
   */
  public readonly name = WebhookDuplicateEvent.NAME

  /**
   * @param provider - The webhook source identifier (e.g. "resend")
   * @param id - The provider's event ID (from svix-id header)
   * @param receivedAt - Timestamp of receipt
   */
  public constructor(
    public readonly provider: string,
    public readonly id: string,
    public readonly receivedAt: Date,
  ) {}
}
