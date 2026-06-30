import { createParamDecorator, type ExecutionContext } from "@nestjs/common"

import { type MailboxLabelStats } from "../interfaces/mailbox-label-stats"

import { MAILBOX_STATS_METADATA_KEY } from "./with-mailbox-stats.decorator"

/**
 * Parameter decorator that returns the Gmail stats resolved on the current
 * request by {@link MailboxStatsInterceptor}.
 *
 * Reads {@link MAILBOX_STATS_METADATA_KEY} from the route handler to verify
 * that {@link WithMailboxStats} was applied. If the metadata is missing, the
 * decorator throws a plain `Error` pointing at the likely fix so the wiring
 * mistake surfaces at first request rather than leaking `undefined` into
 * handler code.
 *
 * When the metadata is present the interceptor will have run; if it succeeded
 * `req.mailboxStats` is populated, and if it failed the upstream Gmail
 * exception propagated and this decorator never runs. If `req.mailboxStats`
 * is somehow still undefined despite the wiring being present, the decorator
 * throws a second invariant-violation error — this indicates a bug in the
 * mailbox package itself rather than consumer misuse.
 *
 * Must be called with parentheses: `@MailboxStats()`.
 *
 * @example
 * ```typescript
 * @Get("stats")
 * @WithMailboxStats()
 * public stats(@MailboxStats() stats: MailboxLabelStats): MailboxLabelStats {
 *   return stats
 * }
 * ```
 */
export const MailboxStats = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): MailboxLabelStats => {
    const hasWiring = Reflect.getMetadata(
      MAILBOX_STATS_METADATA_KEY,
      ctx.getHandler(),
    ) as boolean | undefined
    if (!hasWiring) {
      throw new Error(
        "@WithMailboxStats() must be applied to routes using @MailboxStats()",
      )
    }
    const stats = ctx
      .switchToHttp()
      .getRequest<{ mailboxStats?: MailboxLabelStats }>().mailboxStats
    if (!stats) {
      throw new Error(
        "MailboxStats invariant violated — @WithMailboxStats() is applied but the interceptor did not populate req.mailboxStats. This indicates a mailbox bug.",
      )
    }
    return stats
  },
)
