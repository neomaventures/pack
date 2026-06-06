import { Module } from "@nestjs/common"

import { WebhookHandlerController } from "./webhook-handler.controller"
import { WebhookController } from "./webhook.controller"

/**
 * Standalone module that registers webhook controllers without
 * importing WebhooksModule. This proves global visibility: the
 * guard and interceptor can resolve options across module boundaries.
 */
@Module({
  controllers: [WebhookController, WebhookHandlerController],
})
export class WebhookModule {}
