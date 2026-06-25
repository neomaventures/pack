// Module & Configuration
export { MailboxModule, type MailboxModuleAsyncOptions } from "./mailbox.module"
export { type MailboxOptions, MAILBOX_OPTIONS } from "./mailbox.options"

// Services
export { MailboxService } from "./services/mailbox.service"
export { type GmailLabelStats } from "./services/gmail.service"

// Middlewares
export { MailboxStatsMiddleware } from "./middlewares/mailbox-stats.middleware"

// Decorators
export { MailboxStats } from "./decorators/mailbox-stats.decorator"

// Exceptions
export { MailboxStatsUnavailableException } from "./exceptions/mailbox-stats-unavailable.exception"

// Interfaces
export { type Mailboxable } from "./interfaces/mailboxable.interface"
export { type TokenAccessor } from "./interfaces/token-accessor.interface"

// Entities
export { MailAccount } from "./entities/mail-account.entity"

// Constants
export { GMAIL_READONLY_SCOPE, GmailSystemLabel } from "./constants"
