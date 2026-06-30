import { Controller, Get } from "@nestjs/common"

import {
  type GmailLabelStats,
  MailboxStats,
  WithMailboxStats,
} from "@neomaventures/mailbox"

@Controller("mailbox")
export class MailboxController {
  @Get("stats")
  @WithMailboxStats()
  public stats(@MailboxStats() stats: GmailLabelStats): GmailLabelStats {
    return stats
  }
}
