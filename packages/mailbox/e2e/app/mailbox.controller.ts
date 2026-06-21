import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Query,
} from "@nestjs/common"

import { type GmailLabelStats, MailboxService } from "@neomaventures/mailbox"

@Controller("mailbox")
export class MailboxController {
  public constructor(private readonly mailbox: MailboxService) {}

  @Get("stats")
  public async stats(
    @Headers("authorization") authorization: string | undefined,
    @Query("accountId") accountId: string | undefined,
  ): Promise<GmailLabelStats> {
    if (!authorization?.startsWith("Bearer ")) {
      throw new BadRequestException("Missing bearer token")
    }
    const token = authorization.slice("Bearer ".length)
    const account = { id: accountId ?? "test-account", token }
    return this.mailbox.getStats(account)
  }
}
