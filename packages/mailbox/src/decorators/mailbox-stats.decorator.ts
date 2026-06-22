import { createParamDecorator, type ExecutionContext } from "@nestjs/common"

import { MailboxStatsUnavailableException } from "../exceptions/mailbox-stats-unavailable.exception"
import { type GmailLabelStats } from "../services/gmail.service"

/**
 * Parameter decorator that returns the Gmail stats resolved on the current
 * request by {@link MailboxStatsMiddleware}.
 *
 * Pair with {@link MailboxStatsMiddleware} — the middleware is the silent
 * resolver (populates `req.mailboxStats`, never throws), and this
 * decorator is the enforcer (throws
 * {@link MailboxStatsUnavailableException} when the slot is empty).
 *
 * Must be called with parentheses: `@MailboxStats()`.
 *
 * @throws {MailboxStatsUnavailableException} When no stats are available
 *   on the request — either the middleware failed or it was not mounted
 *   on the route.
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
      mailboxStats?: GmailLabelStats
    }>()
    if (!req.mailboxStats) {
      throw new MailboxStatsUnavailableException()
    }
    return req.mailboxStats
  },
)
