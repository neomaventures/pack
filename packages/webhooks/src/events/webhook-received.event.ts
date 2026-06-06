/**
 * Event emitted after a unique webhook has been persisted and the
 * handler has completed successfully.
 *
 * Consumers listen with `@OnEvent(WebhookReceivedEvent.NAME)`.
 *
 * @example
 * ```typescript
 * @OnEvent(WebhookReceivedEvent.NAME)
 * public onReceived(event: WebhookReceivedEvent): void {
 *   console.log(`Webhook received: ${event.provider}/${event.id}`)
 * }
 * ```
 */
export class WebhookReceivedEvent {
  public static readonly NAME = "webhook.received"

  /**
   * The event name.
   *
   * Note: Will always match WebhookReceivedEvent.NAME
   * if comparisons need to be made.
   */
  public readonly name = WebhookReceivedEvent.NAME

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
