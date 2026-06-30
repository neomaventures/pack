import { Controller, Get } from "@nestjs/common"

import {
  type MailboxLabelStats,
  MailboxStats,
  WithMailboxStats,
} from "@neomaventures/mailbox"

@Controller("mailbox")
export class MailboxController {
  @Get("stats")
  @WithMailboxStats()
  public stats(@MailboxStats() stats: MailboxLabelStats): MailboxLabelStats {
    return stats
  }
}
