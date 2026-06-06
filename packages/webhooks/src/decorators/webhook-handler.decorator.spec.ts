import { faker } from "@faker-js/faker"
import { INTERCEPTORS_METADATA } from "@nestjs/common/constants"

import { WebhookInterceptor } from "../interceptors/webhook.interceptor"

import {
  WEBHOOK_HANDLER_PROVIDER_KEY,
  WebhookHandler,
} from "./webhook-handler.decorator"

const providerName = faker.hacker.ingverb()

describe("WebhookHandler", () => {
  describe(`Given the provider name ${providerName}`, () => {
    class TestController {
      @WebhookHandler(providerName)
      public handle(): void {}
    }

    it("should set the provider name ${providerName} as metadata on the handler", () => {
      const metadata = Reflect.getMetadata(
        WEBHOOK_HANDLER_PROVIDER_KEY,
        TestController.prototype.handle,
      )

      expect(metadata).toBe(providerName)
    })

    it("should apply the WebhookInterceptor", () => {
      const interceptors = Reflect.getMetadata(
        INTERCEPTORS_METADATA,
        TestController.prototype.handle,
      )

      expect(interceptors).toContain(WebhookInterceptor)
    })
  })
})
