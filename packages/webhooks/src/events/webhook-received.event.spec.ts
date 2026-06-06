import { faker } from "@faker-js/faker"

import { WebhookReceivedEvent } from "./webhook-received.event"

describe("WebhookReceivedEvent", () => {
  describe("NAME", () => {
    it("should equal 'webhook.received'", () => {
      expect(WebhookReceivedEvent.NAME).toBe("webhook.received")
    })
  })

  describe("constructor", () => {
    const provider = faker.hacker.ingverb()
    const id = faker.string.alphanumeric(20)
    const receivedAt = faker.date.recent()
    const event = new WebhookReceivedEvent(provider, id, receivedAt)

    it(`should have the name '${WebhookReceivedEvent.NAME}'`, () => {
      expect(event).toHaveProperty("name", WebhookReceivedEvent.NAME)
    })

    it("should store provider as a readonly property", () => {
      expect(event).toHaveProperty("provider", provider)
    })

    it("should store id as a readonly property", () => {
      expect(event).toHaveProperty("id", id)
    })

    it("should store receivedAt as a readonly property", () => {
      expect(event).toHaveProperty("receivedAt", receivedAt)
    })
  })
})
