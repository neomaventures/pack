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
// `MailboxStats` ships as both a value (the @MailboxStats param decorator
// above) and a type (the stats shape). TypeScript's type/value namespace
// split keeps both available under the same name — same pattern as
// `@Module` + `Module` interface in Nest. The type lives under a local
// alias here only to dodge module re-export ambiguity; consumers see it
// as `MailboxStats`.
import { type MailboxStats as MailboxStatsType } from "./interfaces/mailbox-stats"
export type MailboxStats = MailboxStatsType
export { type TokenAccessor } from "./interfaces/token-accessor.interface"

// Constants
export { GMAIL_READONLY_SCOPE, GmailSystemLabel } from "./constants"
