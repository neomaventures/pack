import { faker } from "@faker-js/faker"
import { gmail, GmailClient } from "@neomaventures/google-fixtures"
import { mockserver } from "@neomaventures/mockserver/fixture"
import { Test, type TestingModule } from "@nestjs/testing"

import { GMAIL_API_BASE_URL } from "../constants"
import { GmailApiException } from "../exceptions/gmail-api.exception"
import { GmailNetworkException } from "../exceptions/gmail-network.exception"

import { GmailService } from "./gmail.service"

const gmailClient = new GmailClient(mockserver)

async function buildService(): Promise<GmailService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      GmailService,
      { provide: GMAIL_API_BASE_URL, useValue: gmailClient.baseUrl() },
    ],
  }).compile()

  return module.get(GmailService)
}

describe("GmailService", () => {
  describe("getStats()", () => {
    describe("Given a valid token and label", () => {
      it("should return messageCount and unreadCount from the Gmail response", async () => {
        const service = await buildService()
        const token = faker.string.alphanumeric(40)
        const labelId = "INBOX"
        await gmailClient.expectLabel({
          labelId,
          token,
          label: gmail.label({
            id: labelId,
            messagesTotal: 1234,
            messagesUnread: 56,
          }),
        })

        const stats = await service.getStats(token, labelId)

        expect(stats).toEqual({ messageCount: 1234, unreadCount: 56 })
      })

      it("should rename Gmail's messagesTotal/messagesUnread to messageCount/unreadCount", async () => {
        const service = await buildService()
        const token = faker.string.alphanumeric(40)
        const labelId = "Label_42"
        const messagesTotal = faker.number.int({ min: 1, max: 10000 })
        const messagesUnread = faker.number.int({ min: 0, max: 500 })
        await gmailClient.expectLabel({
          labelId,
          token,
          label: gmail.label({
            id: labelId,
            name: "Receipts",
            type: "user",
            messagesTotal,
            messagesUnread,
          }),
        })

        const stats = await service.getStats(token, labelId)

        expect(stats).toEqual({
          messageCount: messagesTotal,
          unreadCount: messagesUnread,
        })
      })
    })

    describe("Given no labelId argument", () => {
      it("should default to the INBOX label", async () => {
        const service = await buildService()
        const token = faker.string.alphanumeric(40)
        await gmailClient.expectLabel({
          labelId: "INBOX",
          token,
          label: gmail.label({
            id: "INBOX",
            messagesTotal: 7,
            messagesUnread: 3,
          }),
        })

        const stats = await service.getStats(token)

        expect(stats).toEqual({ messageCount: 7, unreadCount: 3 })
      })
    })

    describe.each([
      [401, "INBOX"],
      [404, "Label_DoesNotExist"],
      [500, "INBOX"],
    ])("Given Gmail returns %i for %s", (statusCode, labelId) => {
      it("should throw a GmailApiException carrying the labelId in context", async () => {
        const service = await buildService()
        const token = faker.string.alphanumeric(40)
        const message = faker.lorem.sentence()
        await gmailClient.expectLabelError({
          labelId,
          token,
          statusCode,
          message,
        })

        const error = await service
          .getStats(token, labelId)
          .catch((e: unknown) => e)

        expect(error).toBeInstanceOf(GmailApiException)
        expect((error as GmailApiException).context).toEqual({ labelId })
        expect((error as GmailApiException).endpoint).toBe(
          "/gmail/v1/users/me/labels/{labelId}",
        )
      })
    })

    describe("Given the Gmail fetch fails at the network level", () => {
      it("should throw a GmailNetworkException carrying the labelId in context", async () => {
        const service = await buildService()
        const token = faker.string.alphanumeric(40)
        const labelId = "INBOX"
        await gmailClient.expectNetworkFailure({ labelId, token })

        const error = await service
          .getStats(token, labelId)
          .catch((e: unknown) => e)

        expect(error).toBeInstanceOf(GmailNetworkException)
        expect(error).toMatchObject({
          context: { labelId },
          endpoint: "/gmail/v1/users/me/labels/{labelId}",
          cause: expect.anything(),
        })
      })
    })
  })
})
