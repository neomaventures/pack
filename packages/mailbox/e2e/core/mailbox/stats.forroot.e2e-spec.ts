import { faker } from "@faker-js/faker"
import { gmail, GmailClient } from "@neomaventures/google-fixtures"
import { managedAppInstance } from "@neomaventures/managed-app"
import { mockserver } from "@neomaventures/mockserver/fixture"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

import { TestTokenAccessor } from "../../app/token-accessor"

const { OK, BAD_GATEWAY } = HttpStatus

describe("GET /mailbox/stats (forRoot)", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>
  let gmailClient: GmailClient

  beforeEach(async () => {
    TestTokenAccessor.reset()
    gmailClient = new GmailClient(mockserver)
    app = await managedAppInstance("e2e/app/app.module.forroot.ts#AppModule")
  })

  describe("When Gmail returns label stats for the account", () => {
    it("should respond with HTTP 200 and the renamed shape", async () => {
      const accountId = faker.string.uuid()
      const token = faker.string.alphanumeric(40)
      const messagesTotal = faker.number.int({ min: 1, max: 10000 })
      const messagesUnread = faker.number.int({ min: 0, max: 500 })

      TestTokenAccessor.register(accountId, token)
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
        .set("x-account-id", accountId)
        .expect(OK)

      expect(body).toEqual({
        messageCount: messagesTotal,
        unreadCount: messagesUnread,
      })
    })
  })

  describe("When Gmail responds with an error", () => {
    it("should surface a 502 Bad Gateway", async () => {
      const accountId = faker.string.uuid()
      const token = faker.string.alphanumeric(40)

      TestTokenAccessor.register(accountId, token)
      await gmailClient.expectLabelError({
        labelId: "INBOX",
        token,
        statusCode: 500,
        message: faker.lorem.sentence(),
      })

      await request(app.getHttpServer())
        .get("/mailbox/stats")
        .set("x-account-id", accountId)
        .expect(BAD_GATEWAY)
    })
  })
})
