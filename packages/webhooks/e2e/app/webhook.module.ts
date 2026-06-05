import { Module } from "@nestjs/common"

import { WebhookController } from "./webhook.controller"

/**
 * Standalone module that registers the WebhookController without
 * importing WebhooksModule. This proves global visibility: the
 * guard can resolve WEBHOOKS_OPTIONS across module boundaries.
 */
@Module({
  controllers: [WebhookController],
})
export class WebhookModule {}
