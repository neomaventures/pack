import { WebhooksModule } from "@neomaventures/webhooks"
import { Module } from "@nestjs/common"

import { WebhookController } from "./webhook.controller"

@Module({
  imports: [
    WebhooksModule.forRoot({
      secret: "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
    }),
  ],
  controllers: [WebhookController],
})
export class AppModule {}
