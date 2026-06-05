import {
  WebhooksModule,
  WEBHOOKS_OPTIONS,
  WebhookSignatureGuard,
  type WebhooksOptions,
} from "@neomaventures/webhooks"
import { Controller, Inject, Module, UseGuards } from "@nestjs/common"
import { Test } from "@nestjs/testing"

const TEST_SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"

describe("WebhooksModule", () => {
  describe("forRoot()", () => {
    it("should return a global dynamic module", () => {
      const module = WebhooksModule.forRoot({
        secret: TEST_SECRET,
      })
      expect(module).toHaveProperty("global", true)
    })
  })

  describe("forRootAsync()", () => {
    it("should return a global dynamic module", () => {
      const module = WebhooksModule.forRootAsync({
        useFactory: (): WebhooksOptions => ({
          secret: TEST_SECRET,
        }),
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
          WebhooksModule.forRoot({
            secret: TEST_SECRET,
          }),
          ChildModule,
        ],
      }).compile()

      const controller = module.get(ChildController)
      expect(controller.options).toEqual({
        secret: TEST_SECRET,
      })
    })

    it("should make WebhookSignatureGuard available to child modules that do not import WebhooksModule", async () => {
      @Controller()
      @UseGuards(WebhookSignatureGuard)
      class ChildController {}

      @Module({
        controllers: [ChildController],
      })
      class ChildModule {}

      const module = await Test.createTestingModule({
        imports: [
          WebhooksModule.forRoot({
            secret: TEST_SECRET,
          }),
          ChildModule,
        ],
      }).compile()

      const guard = module.get(WebhookSignatureGuard)
      expect(guard).toBeInstanceOf(WebhookSignatureGuard)
    })
  })
})
