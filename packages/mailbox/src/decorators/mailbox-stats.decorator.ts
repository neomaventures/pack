import { createParamDecorator, type ExecutionContext } from "@nestjs/common"

import { type GmailLabelStats } from "../services/gmail.service"

/**
 * Parameter decorator that returns the Gmail stats resolved on the current
 * request by {@link MailboxStatsMiddleware}.
 *
 * Returns stats resolved by {@link MailboxStatsMiddleware} for the current
 * request. The middleware throws upstream Gmail exceptions on failure, so
 * by the time the decorator runs, `req.mailboxStats` is always populated.
 *
 * Must be called with parentheses: `@MailboxStats()`.
 *
 * @example
 * ```typescript
 * @Get("stats")
 * public stats(@MailboxStats() stats: GmailLabelStats): GmailLabelStats {
 *   return stats
 * }
 * ```
 */
export const MailboxStats = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): GmailLabelStats => {
    const req = ctx.switchToHttp().getRequest<{
      mailboxStats: GmailLabelStats
    }>()
    return req.mailboxStats
  },
)
