import { faker } from "@faker-js/faker"
import { gmail, GmailClient } from "@neomaventures/google-fixtures"
import { mockserver } from "@neomaventures/mockserver/fixture"
import { HttpStatus } from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"

import { GMAIL_API_BASE_URL } from "../constants"
import { MailboxApiException } from "../exceptions/mailbox-api.exception"
import { MailboxNetworkException } from "../exceptions/mailbox-network.exception"

import { GmailService } from "./gmail.service"

const gmailClient = new GmailClient(mockserver)
const token = faker.string.alphanumeric(40)
const labelId = faker.string.alphanumeric(10)
const messagesTotal = faker.number.int({ min: 1, max: 10000 })
const messagesUnread = faker.number.int({ min: 0, max: 500 })

describe("GmailService", () => {
  let service: GmailService
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GmailService,
        { provide: GMAIL_API_BASE_URL, useValue: gmailClient.baseUrl() },
      ],
    }).compile()

    service = module.get(GmailService)
  })

  describe("getStats()", () => {
    describe("Given a valid token and label", () => {
      it("should return messageCount and unreadCount from the Gmail response", async () => {
        await gmailClient.expectLabel({
          labelId,
          token,
          label: gmail.label({
            id: labelId,
            messagesTotal,
            messagesUnread,
          }),
        })

        await expect(service.getStats(token, labelId)).resolves.toEqual({
          messageCount: messagesTotal,
          unreadCount: messagesUnread,
        })
      })
    })

    describe("Given no labelId argument", () => {
      it("should default to the INBOX label", async () => {
        await gmailClient.expectLabel({
          labelId: "INBOX",
          token,
          label: gmail.label({
            id: "INBOX",
            messagesTotal,
            messagesUnread,
          }),
        })

        await expect(service.getStats(token)).resolves.toEqual({
          messageCount: messagesTotal,
          unreadCount: messagesUnread,
        })
      })
    })

    describe.each([
      [401, "INBOX", HttpStatus.UNAUTHORIZED],
      [404, "Label_DoesNotExist", HttpStatus.NOT_FOUND],
      [500, "INBOX", HttpStatus.BAD_GATEWAY],
    ])(
      "Given Gmail returns %i for %s",
      (upstreamStatus, labelId, mappedStatus) => {
        it("should throw a MailboxApiException carrying the labelId in context and the mapped status", async () => {
          const message = faker.lorem.sentence()
          await gmailClient.expectLabelError({
            labelId,
            token,
            statusCode: upstreamStatus,
            message,
          })

          await expect(service.getStats(token, labelId)).rejects.toMatchError(
            MailboxApiException,
            {
              context: { labelId },
              endpoint: "/gmail/v1/users/me/labels/{labelId}",
              statusCode: mappedStatus,
            },
          )
        })
      },
    )

    describe("Given the Gmail fetch fails at the network level", () => {
      it("should throw a MailboxNetworkException carrying the labelId in context", async () => {
        await gmailClient.expectNetworkFailure({ labelId, token })
        await expect(service.getStats(token, labelId)).rejects.toMatchError(
          MailboxNetworkException,
          {
            context: { labelId },
            endpoint: "/gmail/v1/users/me/labels/{labelId}",
          },
        )
      })
    })
  })
})
