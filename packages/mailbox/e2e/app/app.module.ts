import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from "@nestjs/common"

import {
  MailboxModule,
  type MailboxOptions,
  MailboxStatsMiddleware,
} from "@neomaventures/mailbox"

import { MailboxController } from "./mailbox.controller"
import { TestTokenAccessor } from "./token-accessor"

@Module({
  imports: [
    MailboxModule.forRootAsync({
      tokenAccessor: TestTokenAccessor,
      useFactory: (): Omit<MailboxOptions, "tokenAccessor"> => ({
        gmailApiBaseUrl: process.env.GMAIL_API_BASE_URL!,
      }),
    }),
  ],
  controllers: [MailboxController],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MailboxStatsMiddleware).forRoutes("mailbox/stats")
  }
}
