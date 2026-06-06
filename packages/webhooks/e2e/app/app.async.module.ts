import { WebhooksModule, type WebhooksOptions } from "@neomaventures/webhooks"
import { Module } from "@nestjs/common"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { TypeOrmModule } from "@nestjs/typeorm"
import { InboundWebhookEvent } from "fixtures/entities/inbound-webhook-event.entity"

import { WebhookModule } from "./webhook.module"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: ":memory:",
      entities: [InboundWebhookEvent],
      synchronize: true,
    }),
    EventEmitterModule.forRoot(),
    WebhooksModule.forRootAsync({
      useFactory: (): WebhooksOptions => ({
        secret: "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
        entity: InboundWebhookEvent,
      }),
    }),
    WebhookModule,
  ],
})
export class AsyncAppModule {}
