import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common"
import { type Request, type Response } from "express"
import { type Observable } from "rxjs"

import { type MailboxFolderStats } from "../interfaces/mailbox-folder-stats"
import { MailboxService } from "../services/mailbox.service"

declare module "express" {
  interface Request {
    mailboxStats?: MailboxFolderStats | null
  }
}

/**
 * Interceptor that resolves Gmail stats for the current request and stashes
 * them on `req.mailboxStats` for downstream consumption by the
 * {@link MailboxStats} param decorator. The result is also mirrored to
 * `res.locals.mailboxStats` so view templates can read stats directly
 * without a controller-level view-model shim.
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
    const http = context.switchToHttp()
    const req = http.getRequest<Request>()
    const res = http.getResponse<Response>()
    const stats = await this.mailbox.getStats()
    req.mailboxStats = stats
    res.locals.mailboxStats = stats
    return next.handle()
  }
}
