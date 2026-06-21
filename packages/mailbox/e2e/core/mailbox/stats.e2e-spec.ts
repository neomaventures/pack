import { faker } from "@faker-js/faker"
import { gmail, GmailClient } from "@neomaventures/google-fixtures"
import { managedAppInstance } from "@neomaventures/managed-app"
import { mockserver } from "@neomaventures/mockserver/fixture"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

const { OK, BAD_REQUEST, BAD_GATEWAY } = HttpStatus

describe("GET /mailbox/stats (forRootAsync)", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>
  let gmailClient: GmailClient

  beforeEach(async () => {
    gmailClient = new GmailClient(mockserver)
    app = await managedAppInstance()
  })

  describe("When called with a valid bearer token", () => {
    it("should respond with HTTP 200 and the Gmail inbox stats", async () => {
      const token = faker.string.alphanumeric(40)
      const messagesTotal = faker.number.int({ min: 1, max: 10000 })
      const messagesUnread = faker.number.int({ min: 0, max: 500 })

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
        .set("Authorization", `Bearer ${token}`)
        .expect(OK)

      expect(body).toEqual({
        messageCount: messagesTotal,
        unreadCount: messagesUnread,
      })
    })
  })

  describe("When called without a bearer token", () => {
    it("should respond with HTTP 400", async () => {
      await request(app.getHttpServer())
        .get("/mailbox/stats")
        .expect(BAD_REQUEST)
    })
  })

  describe("When Gmail responds with an error", () => {
    it("should surface a 502 Bad Gateway", async () => {
      const token = faker.string.alphanumeric(40)

      await gmailClient.expectLabelError({
        labelId: "INBOX",
        token,
        statusCode: 500,
        message: faker.lorem.sentence(),
      })

      await request(app.getHttpServer())
        .get("/mailbox/stats")
        .set("Authorization", `Bearer ${token}`)
        .expect(BAD_GATEWAY)
    })
  })
})
