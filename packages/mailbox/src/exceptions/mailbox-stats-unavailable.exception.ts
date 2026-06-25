import { HttpException, HttpStatus } from "@nestjs/common"

/**
 * Thrown by the {@link MailboxStats} param decorator when no stats have
 * been resolved on the current request — i.e. {@link MailboxStatsMiddleware}
 * either failed (Gmail unreachable, token missing) or was not mounted on
 * the route at all.
 *
 * Returns `502 Bad Gateway` — the mailbox provider is effectively
 * unavailable for this request. The wire response stays minimal per the
 * pack's exception convention; debug detail lives on the instance for
 * server-side logs.
 *
 * @example
 * ```typescript
 * @Get("stats")
 * public stats(@MailboxStats() stats: GmailLabelStats) {
 *   // If no middleware-resolved stats are on the request,
 *   // MailboxStatsUnavailableException is thrown automatically.
 *   return stats
 * }
 * ```
 */
export class MailboxStatsUnavailableException extends HttpException {
  public constructor() {
    super(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        message: "Mailbox stats are not available for the current request.",
        error: "MailboxStatsUnavailable",
      },
      HttpStatus.BAD_GATEWAY,
    )
  }
}
