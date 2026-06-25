import { faker } from "@faker-js/faker"
import { gmail, GmailClient } from "@neomaventures/google-fixtures"
import { managedAppInstance } from "@neomaventures/managed-app"
import { mockserver } from "@neomaventures/mockserver/fixture"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

import { TestTokenAccessor } from "../../app/token-accessor"

const { OK, UNAUTHORIZED, BAD_GATEWAY } = HttpStatus

describe("GET /mailbox/stats", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>
  let gmailClient: GmailClient

  beforeEach(async () => {
    TestTokenAccessor.reset()
    gmailClient = new GmailClient(mockserver)
    app = await managedAppInstance()
  })

  describe("When Gmail returns label stats", () => {
    it("should respond with HTTP 200 and the renamed shape", async () => {
      const token = faker.string.alphanumeric(40)
      const messagesTotal = faker.number.int({ min: 1, max: 10000 })
      const messagesUnread = faker.number.int({ min: 0, max: 500 })

      TestTokenAccessor.register(token)
      await gmailClient.expectLabel({
        labelId: "INBOX",
        token,
        label: gmail.label({
          id: "INBOX",
          messagesTotal,
          messagesUnread,
        }),
      })

      const { body } = await request(app.getHttpServer())
        .get("/mailbox/stats")
        .expect(OK)

      expect(body).toEqual({
        messageCount: messagesTotal,
        unreadCount: messagesUnread,
      })
    })
  })

  describe.each([401, 404])("When Gmail responds with %i", (status) => {
    it(`should surface HTTP ${status} from GmailApiException`, async () => {
      const token = faker.string.alphanumeric(40)
      const message = faker.lorem.sentence()

      TestTokenAccessor.register(token)
      await gmailClient.expectLabelError({
        labelId: "INBOX",
        token,
        statusCode: status,
        message,
      })

      const { body } = await request(app.getHttpServer())
        .get("/mailbox/stats")
        .expect(status)

      expect(body).toEqual({
        statusCode: status,
        message: `Mailbox API returned ${status}`,
        error: "MailboxApi",
      })
    })
  })

  describe("When Gmail responds with 500", () => {
    it("should collapse to HTTP 502 via GmailApiException", async () => {
      const token = faker.string.alphanumeric(40)
      const message = faker.lorem.sentence()

      TestTokenAccessor.register(token)
      await gmailClient.expectLabelError({
        labelId: "INBOX",
        token,
        statusCode: 500,
        message,
      })

      const { body } = await request(app.getHttpServer())
        .get("/mailbox/stats")
        .expect(BAD_GATEWAY)

      expect(body).toEqual({
        statusCode: BAD_GATEWAY,
        message: "Mailbox API returned 500",
        error: "MailboxApi",
      })
    })
  })

  describe("When Gmail rejects the fetch (network failure)", () => {
    it("should surface HTTP 502 via GmailNetworkException", async () => {
      const token = faker.string.alphanumeric(40)

      TestTokenAccessor.register(token)
      await gmailClient.expectNetworkFailure({
        labelId: "INBOX",
        token,
      })

      const { body } = await request(app.getHttpServer())
        .get("/mailbox/stats")
        .expect(BAD_GATEWAY)

      expect(body).toEqual({
        statusCode: BAD_GATEWAY,
        message: "Mailbox network error",
        error: "MailboxNetwork",
      })
    })
  })

  describe("When no token is registered", () => {
    it("should respond with HTTP 401 — token resolution is the consumer's exception boundary", async () => {
      await request(app.getHttpServer())
        .get("/mailbox/stats")
        .expect(UNAUTHORIZED)
    })
  })
})
