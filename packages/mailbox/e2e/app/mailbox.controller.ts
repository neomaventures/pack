import { Controller, Get } from "@nestjs/common"

import {
  type MailboxFolderStats,
  MailboxStats,
  WithMailboxStats,
} from "@neomaventures/mailbox"

@Controller("mailbox")
export class MailboxController {
  @Get("stats")
  @WithMailboxStats()
  public stats(@MailboxStats() stats: MailboxFolderStats): MailboxFolderStats {
    return stats
  }
}
