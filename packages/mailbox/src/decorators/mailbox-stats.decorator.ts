import { createParamDecorator, type ExecutionContext } from "@nestjs/common"

import { type GmailLabelStats } from "../services/gmail.service"

/**
 * Parameter decorator that returns the Gmail stats resolved on the current
 * request by {@link MailboxStatsMiddleware}.
 *
 * The middleware throws upstream Gmail exceptions on failure, so by the
 * time the decorator runs, `req.mailboxStats` is populated whenever the
 * middleware was installed on the route. If it's missing, that can only
 * mean the consumer forgot to install `MailboxStatsMiddleware` on this
 * route — a wiring bug. The decorator throws a plain `Error` pointing at
 * the likely fix so the mistake surfaces at first request rather than
 * leaking `undefined` into handler code.
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
      mailboxStats?: GmailLabelStats
    }>()
    if (!req.mailboxStats) {
      throw new Error(
        "MailboxStats is not available — did you install MailboxStatsMiddleware on this route?",
      )
    }
    return req.mailboxStats
  },
)
