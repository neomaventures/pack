import { faker } from "@faker-js/faker"
import {
  type MockServerConfig,
  MockServerClient,
  startContainer,
  stopContainer,
} from "@neomaventures/mockserver"

import { gmail } from "./gmail"
import { GmailClient } from "./gmail-client"

describe("GmailClient", () => {
  const prefix = `neoma-test-gf-gmail-${faker.string.alphanumeric(4)}`
  const port = 15_080 + faker.number.int({ min: 0, max: 899 })
  let config: MockServerConfig
  let mockServerClient: MockServerClient
  let gmailClient: GmailClient
  let baseUrl: string

  beforeAll(async () => {
    config = await startContainer({ prefix, port })
    const managementUrl = `http://localhost:${config.port}/mockserver`
    mockServerClient = new MockServerClient(managementUrl)
    gmailClient = new GmailClient(mockServerClient)
    baseUrl = `http://localhost:${config.port}`
  }, 60_000)

  afterAll(async () => {
    await stopContainer({ prefix })
  })

  beforeEach(async () => {
    await mockServerClient.reset()
  })

  describe("baseUrl()", () => {
    it("should return the mock server base URL without the management suffix", () => {
      expect(gmailClient.baseUrl()).toBe(baseUrl)
    })
  })

  describe("expectLabel()", () => {
    it("should register an expectation that returns the label", async () => {
      const labelId = "INBOX"
      const token = faker.string.alphanumeric(40)
      const label = gmail.label({ id: labelId })

      await gmailClient.expectLabel({ labelId, token, label })

      const result = await fetch(
        `${baseUrl}/gmail/v1/users/me/labels/${labelId}`,
        { method: "GET", headers: { Authorization: `Bearer ${token}` } },
      )

      expect(result.status).toBe(200)
      expect(await result.json()).toEqual(label)
    })

    it("should only match the configured token", async () => {
      const labelId = "INBOX"
      const token = faker.string.alphanumeric(40)
      const wrongToken = faker.string.alphanumeric(40)

      await gmailClient.expectLabel({
        labelId,
        token,
        label: gmail.label({ id: labelId }),
      })

      const result = await fetch(
        `${baseUrl}/gmail/v1/users/me/labels/${labelId}`,
        { method: "GET", headers: { Authorization: `Bearer ${wrongToken}` } },
      )

      expect(result.status).toBe(404)
    })

    it("should default to remainingTimes: 1", async () => {
      const labelId = "INBOX"
      const token = faker.string.alphanumeric(40)

      await gmailClient.expectLabel({
        labelId,
        token,
        label: gmail.label({ id: labelId }),
      })

      const first = await fetch(
        `${baseUrl}/gmail/v1/users/me/labels/${labelId}`,
        { method: "GET", headers: { Authorization: `Bearer ${token}` } },
      )
      expect(first.status).toBe(200)

      const second = await fetch(
        `${baseUrl}/gmail/v1/users/me/labels/${labelId}`,
        { method: "GET", headers: { Authorization: `Bearer ${token}` } },
      )
      expect(second.status).toBe(404)
    })
  })

  describe("expectLabelError()", () => {
    it.each([
      [401, "Invalid Credentials"],
      [404, "Not Found"],
      [500, "Backend Error"],
    ])(
      "should respond with %i and the supplied message",
      async (statusCode, message) => {
        const labelId = faker.string.alphanumeric(10)
        const token = faker.string.alphanumeric(40)

        await gmailClient.expectLabelError({
          labelId,
          token,
          statusCode,
          message,
        })

        const result = await fetch(
          `${baseUrl}/gmail/v1/users/me/labels/${labelId}`,
          { method: "GET", headers: { Authorization: `Bearer ${token}` } },
        )

        expect(result.status).toBe(statusCode)
        expect(await result.json()).toEqual({
          error: { code: statusCode, message },
        })
      },
    )
  })
})
