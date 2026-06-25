import { Injectable, NestMiddleware } from "@nestjs/common"
import { NextFunction, Request, Response } from "express"

import { type GmailLabelStats } from "../services/gmail.service"
import { MailboxService } from "../services/mailbox.service"

/**
 * Resolves Gmail stats for the current request and stashes them on
 * `req.mailboxStats`. Throws upstream Gmail exceptions on failure
 * ({@link GmailApiException}, {@link GmailNetworkException}) — pair with
 * `@neomaventures/exceptions`' `ExceptionHandlerModule.forRoot({ errorTemplates })`
 * to render a friendly error UI on those exceptions.
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
    req.mailboxStats = await this.mailbox.getStats()
    next()
  }
}
