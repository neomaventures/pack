import { Controller, Get, Headers } from "@nestjs/common"

import { type GmailLabelStats, MailboxService } from "@neomaventures/mailbox"

@Controller("mailbox")
export class MailboxController {
  public constructor(private readonly mailbox: MailboxService) {}

  @Get("stats")
  public async stats(
    @Headers("x-account-id") accountId: string,
  ): Promise<GmailLabelStats> {
    return this.mailbox.getStats({ id: accountId })
  }
}
