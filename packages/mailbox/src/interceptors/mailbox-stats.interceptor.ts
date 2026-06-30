import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common"
import { type Request } from "express"
import { type Observable } from "rxjs"

import { type GmailLabelStats } from "../services/gmail.service"
import { MailboxService } from "../services/mailbox.service"

declare module "express" {
  interface Request {
    mailboxStats?: GmailLabelStats
  }
}

/**
 * Interceptor that resolves Gmail stats for the current request and stashes
 * them on `req.mailboxStats` for downstream consumption by the
 * {@link MailboxStats} param decorator.
 *
 * Attached automatically by the {@link WithMailboxStats} method decorator —
 * consumers do not register it directly. Because attachment is
 * decorator-scoped (not global), the interceptor only runs on routes that
 * opted in, so unrelated routes pay no Gmail round-trip.
 *
 * Throws upstream Gmail exceptions on failure ({@link MailboxApiException},
 * {@link MailboxNetworkException}) — pair with `@neomaventures/exceptions`'
 * `ExceptionHandlerModule.forRoot({ errorTemplates })` to render a friendly
 * error UI on those exceptions.
 */
@Injectable()
export class MailboxStatsInterceptor implements NestInterceptor {
  public constructor(private readonly mailbox: MailboxService) {}

  /**
   * Fetches stats and attaches them to the request before invoking the
   * handler.
   *
   * @param context - The execution context
   * @param next - The next handler in the chain
   * @returns An observable that emits the handler's response unchanged
   */
  public async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<Request>()
    req.mailboxStats = await this.mailbox.getStats()
    return next.handle()
  }
}
