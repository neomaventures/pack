import { createParamDecorator, type ExecutionContext } from "@nestjs/common"

import { type MailboxFolderStats } from "../interfaces/mailbox-folder-stats"

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
 * When the metadata is present the interceptor will have run. Three outcomes:
 *
 * - **`req.mailboxStats` is a stats object** — the accessor returned a
 *   token and the upstream call succeeded; the decorator returns the stats.
 * - **`req.mailboxStats` is `null`** — the accessor returned `null` (no
 *   token available on this request; a normal, non-exceptional state per
 *   the {@link TokenAccessor} contract); the decorator returns `null`.
 *   Handlers branch on presence.
 * - **`req.mailboxStats` is `undefined`** — the interceptor didn't run
 *   despite the wiring being present; the decorator throws an invariant-
 *   violation error indicating a bug in the mailbox package itself.
 *
 * If the wiring metadata is missing (i.e. `@WithMailboxStats()` was not
 * applied to the handler), the decorator throws a plain `Error` pointing
 * at the likely fix so the wiring mistake surfaces at first request
 * rather than leaking `undefined` into handler code.
 *
 * Must be called with parentheses: `@MailboxStats()`.
 *
 * @example
 * ```typescript
 * @Get("stats")
 * @WithMailboxStats()
 * public stats(
 *   @MailboxStats() stats: MailboxFolderStats | null,
 * ): { stats: MailboxFolderStats | null } {
 *   return { stats }
 * }
 * ```
 */
export const MailboxStats = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): MailboxFolderStats | null => {
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
      .getRequest<{ mailboxStats?: MailboxFolderStats | null }>().mailboxStats
    if (stats === undefined) {
      throw new Error(
        "MailboxStats invariant violated — @WithMailboxStats() is applied but the interceptor did not populate req.mailboxStats. This indicates a mailbox bug.",
      )
    }
    return stats
  },
)
