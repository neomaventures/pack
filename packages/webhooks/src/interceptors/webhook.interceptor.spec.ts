import { callHandler, executionContext, express } from "@neomaventures/fixtures"
import {
  type CallHandler,
  Controller,
  type ExecutionContext,
  Post,
} from "@nestjs/common"
import { EventEmitter2, EventEmitterModule } from "@nestjs/event-emitter"
import { Test, type TestingModule } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import * as svix from "fixtures/svix"
import { lastValueFrom, throwError } from "rxjs"
import {
  Column,
  DataSource,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm"

import { WebhookHandler } from "../decorators/webhook-handler.decorator"
import { WebhookDuplicateEvent } from "../events/webhook-duplicate.event"
import { WebhookReceivedEvent } from "../events/webhook-received.event"
import { type WebhookEventEntity } from "../interfaces/webhook-event-entity.interface"
import { WEBHOOKS_OPTIONS } from "../webhooks.options"

import { WebhookInterceptor } from "./webhook.interceptor"

@Entity()
@Unique(["provider", "externalId"])
class TestWebhookEvent implements WebhookEventEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @Column()
  public provider!: string

  @Column()
  public externalId!: string

  @Column()
  public receivedAt!: Date
}

@Controller("webhooks")
class TestWebhookController {
  @Post()
  @WebhookHandler("resend")
  public handle(): void {}
}

const EXTERNAL_ID = svix.id()
const HANDLER = { controller: TestWebhookController, method: "handle" as const }

const OPTIONS = {
  provide: WEBHOOKS_OPTIONS,
  useValue: {
    secret: "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
    entity: TestWebhookEvent,
  },
}

const TYPE_ORM = TypeOrmModule.forRoot({
  type: "sqlite",
  database: ":memory:",
  entities: [TestWebhookEvent],
  synchronize: true,
})

describe("WebhookInterceptor", () => {
  describe("Given EventEmitter2 is available", () => {
    let interceptor: WebhookInterceptor
    let dataSource: DataSource
    let eventEmitter: EventEmitter2
    let module: TestingModule
    let ctx: ExecutionContext

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [TYPE_ORM, EventEmitterModule.forRoot()],
        providers: [WebhookInterceptor, OPTIONS],
      }).compile()

      interceptor = module.get(WebhookInterceptor)
      dataSource = module.get(DataSource)
      eventEmitter = module.get(EventEmitter2)
      ctx = executionContext(
        express.request({ headers: { "svix-id": EXTERNAL_ID } }),
        express.response(),
        HANDLER,
      ) as ExecutionContext
    })

    afterEach(async () => {
      await module.close()
    })

    describe("Given a unique webhook event", () => {
      it("should persist the webhook event entity", async () => {
        const next = callHandler()

        const result$ = await interceptor.intercept(ctx, next)
        await lastValueFrom(result$)

        const repository = dataSource.getRepository(TestWebhookEvent)
        const events = await repository.find()

        expect(events).toHaveLength(1)
        expect(events[0]).toMatchObject({
          provider: "resend",
          externalId: EXTERNAL_ID,
        })
        expect(events[0].receivedAt).toBeInstanceOf(Date)
      })

      it("should return the handler response", async () => {
        const expectedResponse = { handled: true }
        const next = callHandler(expectedResponse)

        const result$ = await interceptor.intercept(ctx, next)
        const result = await lastValueFrom(result$)

        expect(result).toEqual(expectedResponse)
      })

      it("should emit webhook.received", async () => {
        const emittedEvents: WebhookReceivedEvent[] = []
        eventEmitter.on(
          WebhookReceivedEvent.NAME,
          (event: WebhookReceivedEvent) => emittedEvents.push(event),
        )

        const next = callHandler()

        const result$ = await interceptor.intercept(ctx, next)
        await lastValueFrom(result$)

        expect(emittedEvents).toHaveLength(1)
        expect(emittedEvents[0]).toBeInstanceOf(WebhookReceivedEvent)
        expect(emittedEvents[0]).toMatchObject({
          provider: "resend",
          id: EXTERNAL_ID,
        })
      })

      it("should not emit webhook.duplicate", async () => {
        const emittedEvents: WebhookDuplicateEvent[] = []
        eventEmitter.on(
          WebhookDuplicateEvent.NAME,
          (event: WebhookDuplicateEvent) => emittedEvents.push(event),
        )

        const next = callHandler()

        const result$ = await interceptor.intercept(ctx, next)
        await lastValueFrom(result$)

        expect(emittedEvents).toHaveLength(0)
      })

      it("should propagate errors thrown by the handler", async () => {
        const handlerError = new Error("handler failure")
        const next: CallHandler = {
          handle: () => throwError(() => handlerError),
        }

        const result$ = await interceptor.intercept(ctx, next)

        await expect(lastValueFrom(result$)).rejects.toThrow(handlerError)
      })
    })

    describe("Given a duplicate webhook event", () => {
      const originalReceivedAt = new Date("2025-01-01T00:00:00Z")

      beforeEach(async () => {
        const repository = dataSource.getRepository(TestWebhookEvent)
        await repository.save(
          repository.create({
            provider: "resend",
            externalId: EXTERNAL_ID,
            receivedAt: originalReceivedAt,
          }),
        )
      })

      it("should not invoke the handler", async () => {
        const next = callHandler()

        const result$ = await interceptor.intercept(ctx, next)
        const result = await lastValueFrom(result$)

        expect(result).toBeUndefined()
      })

      it("should set the response status to 204", async () => {
        const next = callHandler()
        const res = ctx.switchToHttp().getResponse()

        const result$ = await interceptor.intercept(ctx, next)
        await lastValueFrom(result$)

        expect(res.statusCode).toBe(204)
      })

      it("should not persist a second entity", async () => {
        const next = callHandler()

        const result$ = await interceptor.intercept(ctx, next)
        await lastValueFrom(result$)

        const repository = dataSource.getRepository(TestWebhookEvent)
        const events = await repository.find()
        expect(events).toHaveLength(1)
      })

      it("should emit webhook.duplicate", async () => {
        const emittedEvents: WebhookDuplicateEvent[] = []
        eventEmitter.on(
          WebhookDuplicateEvent.NAME,
          (event: WebhookDuplicateEvent) => emittedEvents.push(event),
        )

        const next = callHandler()

        const result$ = await interceptor.intercept(ctx, next)
        await lastValueFrom(result$)

        expect(emittedEvents).toHaveLength(1)
        expect(emittedEvents[0]).toBeInstanceOf(WebhookDuplicateEvent)
        expect(emittedEvents[0]).toMatchObject({
          provider: "resend",
          id: EXTERNAL_ID,
        })
      })

      it("should not emit webhook.received", async () => {
        const emittedEvents: WebhookReceivedEvent[] = []
        eventEmitter.on(
          WebhookReceivedEvent.NAME,
          (event: WebhookReceivedEvent) => emittedEvents.push(event),
        )

        const next = callHandler()

        const result$ = await interceptor.intercept(ctx, next)
        await lastValueFrom(result$)

        expect(emittedEvents).toHaveLength(0)
      })

      it("should set receivedAt to the current time, not the original", async () => {
        const emittedEvents: WebhookDuplicateEvent[] = []
        eventEmitter.on(
          WebhookDuplicateEvent.NAME,
          (event: WebhookDuplicateEvent) => emittedEvents.push(event),
        )

        const next = callHandler()

        const result$ = await interceptor.intercept(ctx, next)
        await lastValueFrom(result$)

        expect(emittedEvents[0].receivedAt).not.toEqual(originalReceivedAt)
        expect(emittedEvents[0].receivedAt).toBeBetween(
          new Date(Date.now() - 10_000),
          new Date(Date.now() + 10_000),
        )
      })
    })
  })
})
