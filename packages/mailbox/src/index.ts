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
export type { MailboxFolderStats } from "./interfaces/mailbox-folder-stats"
export { type TokenAccessor } from "./interfaces/token-accessor.interface"

// Exceptions
export { MailboxApiException } from "./exceptions/mailbox-api.exception"
export { MailboxNetworkException } from "./exceptions/mailbox-network.exception"

// Constants
export { GMAIL_READONLY_SCOPE, MailboxFolder } from "./constants"
