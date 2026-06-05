import { WebhooksModule, type WebhooksOptions } from "@neomaventures/webhooks"
import { Module } from "@nestjs/common"

import { WebhookModule } from "./webhook.module"

@Module({
  imports: [
    WebhooksModule.forRootAsync({
      useFactory: (): WebhooksOptions => ({
        secret: "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
      }),
    }),
    WebhookModule,
  ],
})
export class AsyncAppModule {}
