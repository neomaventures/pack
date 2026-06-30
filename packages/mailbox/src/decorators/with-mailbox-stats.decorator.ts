import { applyDecorators, SetMetadata, UseInterceptors } from "@nestjs/common"

import { MailboxStatsInterceptor } from "../interceptors/mailbox-stats.interceptor"

/**
 * Metadata key stamped on a route handler by {@link WithMailboxStats}.
 */
export const MAILBOX_STATS_METADATA_KEY = "mailbox:stats"

/**
 * Method decorator that opts a route in to Gmail-stats resolution.
 *
 * Composes `SetMetadata` (stamps {@link MAILBOX_STATS_METADATA_KEY}) and
 * `UseInterceptors` (attaches {@link MailboxStatsInterceptor}). The
 * interceptor fetches Gmail stats before the handler runs and stashes
 * them on `req.mailboxStats`; pair with {@link MailboxStats} to inject
 * them as a handler parameter.
 *
 * @returns A composed method decorator
 *
 * @example
 * ```typescript
 * @Get("profile")
 * @WithMailboxStats()
 * public profile(@MailboxStats() stats: MailboxLabelStats) {
 *   return { stats }
 * }
 * ```
 */
export function WithMailboxStats(): MethodDecorator {
  return applyDecorators(
    SetMetadata(MAILBOX_STATS_METADATA_KEY, true),
    UseInterceptors(MailboxStatsInterceptor),
  )
}
