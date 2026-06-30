// Module & Configuration
export { MailboxModule, type MailboxModuleAsyncOptions } from "./mailbox.module"
export { type MailboxOptions, MAILBOX_OPTIONS } from "./mailbox.options"

// Services
export { MailboxService } from "./services/mailbox.service"

// Decorators
export { MailboxStats } from "./decorators/mailbox-stats.decorator"
export { WithMailboxStats } from "./decorators/with-mailbox-stats.decorator"

// Interceptors
export { MailboxStatsInterceptor } from "./interceptors/mailbox-stats.interceptor"

// Interfaces
export { type MailboxLabelStats } from "./interfaces/mailbox-label-stats"
export { type TokenAccessor } from "./interfaces/token-accessor.interface"

// Constants
export { GMAIL_READONLY_SCOPE, GmailSystemLabel } from "./constants"
