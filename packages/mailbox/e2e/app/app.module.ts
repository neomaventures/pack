import { Module } from "@nestjs/common"

import { MailboxModule, type MailboxOptions } from "@neomaventures/mailbox"

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
export class AppModule {}
