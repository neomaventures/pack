import { applyDecorators, SetMetadata, UseInterceptors } from "@nestjs/common"

import { WebhookInterceptor } from "../interceptors/webhook.interceptor"

/**
 * Metadata key used to store the provider name on the handler method.
 *
 * @internal Used by {@link WebhookInterceptor} to read the provider.
 */
export const WEBHOOK_HANDLER_PROVIDER_KEY = "webhooks:handler:provider"

/**
 * Method decorator that applies the {@link WebhookInterceptor} for
 * webhook deduplication and event emission.
 *
 * Composes `SetMetadata` (to store the provider name) and
 * `UseInterceptors` (to attach the interceptor).
 *
 * @param provider - Label identifying the webhook source (e.g. `"resend"`, `"clerk"`).
 *                   Stored on the persisted entity.
 * @returns A composed method decorator
 *
 * @example
 * ```typescript
 * @Post("inbound-email")
 * @UseGuards(WebhookSignatureGuard)
 * @WebhookHandler("resend")
 * public async handleInboundEmail(@Body() payload: any): Promise<void> {
 *   // Handler only runs for unique, verified events
 * }
 * ```
 */
export function WebhookHandler(provider: string): MethodDecorator {
  return applyDecorators(
    SetMetadata(WEBHOOK_HANDLER_PROVIDER_KEY, provider),
    UseInterceptors(WebhookInterceptor),
  )
}
