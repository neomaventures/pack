import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"

import {
  MailAccount,
  MailboxModule,
  type MailboxOptions,
} from "@neomaventures/mailbox"

import { MailboxController } from "./mailbox.controller"
import { TestTokenAccessor } from "./token-accessor"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: ":memory:",
      entities: [MailAccount],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([MailAccount]),
    MailboxModule.forRootAsync({
      useFactory: (): MailboxOptions => ({
        tokenAccessor: TestTokenAccessor,
        gmailApiBaseUrl: process.env.GMAIL_API_BASE_URL!,
      }),
    }),
  ],
  controllers: [MailboxController],
})
export class AppModule {}
