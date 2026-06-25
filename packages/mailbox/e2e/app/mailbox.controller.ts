import { Controller, Get } from "@nestjs/common"

import { type GmailLabelStats, MailboxStats } from "@neomaventures/mailbox"

@Controller("mailbox")
export class MailboxController {
  @Get("stats")
  public stats(@MailboxStats() stats: GmailLabelStats): GmailLabelStats {
    return stats
  }
}
