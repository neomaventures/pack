import { Injectable, NestMiddleware } from "@nestjs/common"
import { NextFunction, Request, Response } from "express"

import { type GmailLabelStats } from "../services/gmail.service"
import { MailboxService } from "../services/mailbox.service"

/**
 * Silent resolver — fetches Gmail stats for the current request and
 * stashes them on `req.mailboxStats`. Never throws: any error from
 * {@link MailboxService.getStats} (missing token, Gmail unreachable,
 * upstream non-2xx) is swallowed and `req.mailboxStats` is left
 * `undefined`. Enforcement is the {@link MailboxStats} param decorator's
 * job — it throws {@link MailboxStatsUnavailableException} when the slot
 * is empty.
 *
 * Mounting is the consumer's responsibility — apply it to the routes
 * where you want stats available via the param decorator:
 *
 * @example
 * ```typescript
 * export class AppModule implements NestModule {
 *   public configure(consumer: MiddlewareConsumer): void {
 *     consumer.apply(MailboxStatsMiddleware).forRoutes("profile")
 *   }
 * }
 * ```
 */
@Injectable()
export class MailboxStatsMiddleware implements NestMiddleware {
  public constructor(private readonly mailbox: MailboxService) {}

  public async use(
    req: Request & { mailboxStats?: GmailLabelStats },
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      req.mailboxStats = await this.mailbox.getStats()
    } catch {
      req.mailboxStats = undefined
    }
    next()
  }
}
