import { type GmailLabelStats } from "@neomaventures/mailbox"

declare module "express" {
  interface Request {
    mailboxStats?: GmailLabelStats
  }
}
