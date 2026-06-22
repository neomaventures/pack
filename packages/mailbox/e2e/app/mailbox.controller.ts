import { Controller, Get } from "@nestjs/common"

import { type GmailLabelStats, MailboxService } from "@neomaventures/mailbox"

@Controller("mailbox")
export class MailboxController {
  public constructor(private readonly mailbox: MailboxService) {}

  @Get("stats")
  public async stats(): Promise<GmailLabelStats> {
    return this.mailbox.getStats()
  }
}
