// Constants
export { GMAIL_READONLY_SCOPE, GmailSystemLabel } from "./constants"

// Entities
export { MailAccount } from "./entities/mail-account.entity"

// Interfaces
export { type Mailboxable } from "./interfaces/mailboxable.interface"
export { type TokenAccessor } from "./interfaces/token-accessor.interface"

// Module
export { MailboxModule } from "./mailbox.module"
export { type MailboxOptions, MAILBOX_OPTIONS } from "./mailbox.options"

// Services
export { MailboxService } from "./services/mailbox.service"
export { type GmailLabelStats } from "./services/gmail.service"
