import { Controller, Get, Req } from "@nestjs/common"
import { type Request } from "express"

import { type GmailLabelStats } from "@neomaventures/mailbox"

@Controller("mailbox")
export class MailboxController {
  @Get("stats")
  public stats(@Req() req: Request): GmailLabelStats {
    return req.mailboxStats!
  }
}
