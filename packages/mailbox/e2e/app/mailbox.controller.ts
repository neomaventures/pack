import { Controller, Get } from "@nestjs/common"

import { MailboxStats, WithMailboxStats } from "@neomaventures/mailbox"

@Controller("mailbox")
export class MailboxController {
  @Get("stats")
  @WithMailboxStats()
  public stats(@MailboxStats() stats: MailboxStats): MailboxStats {
    return stats
  }
}
