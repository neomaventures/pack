import {
  type CallHandler,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { EventEmitter2 } from "@nestjs/event-emitter"
import { type Request, type Response } from "express"
import { type Observable, of } from "rxjs"
import { DataSource, type Repository } from "typeorm"

import { WEBHOOK_HANDLER_PROVIDER_KEY } from "../decorators/webhook-handler.decorator"
import { WebhookDuplicateEvent } from "../events/webhook-duplicate.event"
import { WebhookReceivedEvent } from "../events/webhook-received.event"
import { type WebhookEventEntity } from "../interfaces/webhook-event-entity.interface"
import { WEBHOOKS_OPTIONS, type WebhooksOptions } from "../webhooks.options"

/**
 * Interceptor that persists inbound webhook events and emits domain events.
 *
 * Extracts the event ID from the `svix-id` header, persists the event
 * entity, runs the handler, and emits a `webhook.received` event on success.
 *
 * @example
 * Applied automatically by the `@WebhookHandler()` decorator:
 * ```typescript
 * @WebhookHandler("resend")
 * public async handleInboundEmail(@Body() payload: any): Promise<void> { }
 * ```
 */
@Injectable()
export class WebhookInterceptor implements NestInterceptor {
  private readonly repository: Repository<WebhookEventEntity>

  /**
   * @param options - The webhooks module options
   * @param reflector - NestJS reflector for reading metadata
   * @param eventEmitter - EventEmitter2 for domain events
   * @param dataSource - TypeORM data source for repository access
   */
  public constructor(
    @Inject(WEBHOOKS_OPTIONS) private readonly options: WebhooksOptions,
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitter2,
    dataSource: DataSource,
  ) {
    this.repository = dataSource.getRepository(this.options.entity)
  }

  /**
   * Intercepts the request to persist the webhook event and emit domain events.
   *
   * When a duplicate webhook is detected (same provider + externalId already
   * exists), the interceptor short-circuits with HTTP 204 No Content, emits
   * a `webhook.duplicate` event, and skips the handler entirely.
   *
   * @param context - The execution context
   * @param next - The next handler in the chain
   * @returns An observable that emits the handler's response after persistence,
   *          or `of(undefined)` if the webhook is a duplicate
   */
  public async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest<Request>()
    const res = context.switchToHttp().getResponse<Response>()
    const handler = context.getHandler()

    const provider = this.reflector.get<string>(
      WEBHOOK_HANDLER_PROVIDER_KEY,
      handler,
    )

    const externalId = req.headers["svix-id"] as string
    const receivedAt = new Date()

    // Precheck: does this webhook already exist?
    const existing = await this.repository.findOneBy({ provider, externalId })

    if (existing) {
      next = {
        handle: (): Observable<undefined> => {
          res.status(HttpStatus.NO_CONTENT)
          return of(undefined)
        },
      }
    } else {
      await this.repository.save(
        this.repository.create({ provider, externalId, receivedAt }),
      )
    }

    const event = existing
      ? new WebhookDuplicateEvent(provider, externalId, receivedAt)
      : new WebhookReceivedEvent(provider, externalId, receivedAt)

    this.eventEmitter.emit(event.name, event)

    return next.handle()
  }
}
