import {
  WebhooksModule,
  WEBHOOKS_OPTIONS,
  WebhookSignatureGuard,
  type WebhooksOptions,
  type WebhookEventEntity,
} from "@neomaventures/webhooks"
import { Controller, Inject, Module } from "@nestjs/common"
import { EventEmitterModule } from "@nestjs/event-emitter"
import { Test } from "@nestjs/testing"
import { TypeOrmModule } from "@nestjs/typeorm"
import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm"

@Entity()
@Unique(["provider", "externalId"])
class StubWebhookEvent implements WebhookEventEntity {
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  @Column()
  public provider!: string

  @Column()
  public externalId!: string

  @Column()
  public receivedAt!: Date
}

const TEST_SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"
const TEST_OPTIONS: WebhooksOptions = {
  secret: TEST_SECRET,
  entity: StubWebhookEvent,
}

describe("WebhooksModule", () => {
  describe("forRoot()", () => {
    it("should return a global dynamic module", () => {
      const module = WebhooksModule.forRoot(TEST_OPTIONS)
      expect(module).toHaveProperty("global", true)
    })
  })

  describe("forRootAsync()", () => {
    it("should return a global dynamic module", () => {
      const module = WebhooksModule.forRootAsync({
        useFactory: (): WebhooksOptions => TEST_OPTIONS,
      })
      expect(module).toHaveProperty("global", true)
    })
  })

  describe("global registration", () => {
    it("should make WEBHOOKS_OPTIONS available to child modules that do not import WebhooksModule", async () => {
      @Controller()
      class ChildController {
        public constructor(
          @Inject(WEBHOOKS_OPTIONS)
          public readonly options: WebhooksOptions,
        ) {}
      }

      @Module({
        controllers: [ChildController],
      })
      class ChildModule {}

      const module = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "sqlite",
            database: ":memory:",
            entities: [StubWebhookEvent],
            synchronize: true,
          }),
          EventEmitterModule.forRoot(),
          WebhooksModule.forRoot(TEST_OPTIONS),
          ChildModule,
        ],
      }).compile()

      const controller = module.get(ChildController)
      expect(controller.options).toEqual(TEST_OPTIONS)

      await module.close()
    })

    it("should make WebhookSignatureGuard available to child modules that do not import WebhooksModule", async () => {
      @Controller()
      class ChildController {
        public constructor(public readonly guard: WebhookSignatureGuard) {}
      }

      @Module({
        controllers: [ChildController],
      })
      class ChildModule {}

      const module = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: "sqlite",
            database: ":memory:",
            entities: [StubWebhookEvent],
            synchronize: true,
          }),
          EventEmitterModule.forRoot(),
          WebhooksModule.forRoot(TEST_OPTIONS),
          ChildModule,
        ],
      }).compile()

      const controller = module.get(ChildController)
      expect(controller.guard).toBeInstanceOf(WebhookSignatureGuard)

      await module.close()
    })
  })
})
