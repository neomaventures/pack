import { faker } from "@faker-js/faker"

import { WebhookDuplicateEvent } from "./webhook-duplicate.event"

describe("WebhookDuplicateEvent", () => {
  describe("NAME", () => {
    it("should equal 'webhook.duplicate'", () => {
      expect(WebhookDuplicateEvent.NAME).toBe("webhook.duplicate")
    })
  })

  describe("constructor", () => {
    const provider = faker.hacker.ingverb()
    const id = faker.string.alphanumeric(20)
    const receivedAt = faker.date.recent()
    const event = new WebhookDuplicateEvent(provider, id, receivedAt)

    it(`should have the name '${WebhookDuplicateEvent.NAME}'`, () => {
      expect(event).toHaveProperty("name", WebhookDuplicateEvent.NAME)
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
