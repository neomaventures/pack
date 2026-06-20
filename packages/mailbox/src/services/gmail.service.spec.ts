import { faker } from "@faker-js/faker"
import { gmail as gmailFakes } from "@neomaventures/google-fixtures"
import {
  MockserverBodyTypes,
  MockserverMatchTypes,
} from "@neomaventures/mockserver"
import { mockserver } from "@neomaventures/mockserver/fixture"
import { Test, type TestingModule } from "@nestjs/testing"

import { GMAIL_API_BASE_URL } from "../constants"

import { GmailService } from "./gmail.service"

const baseUrl = mockserver.baseUrl.replace(/\/mockserver$/, "")

async function buildService(): Promise<GmailService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      GmailService,
      { provide: GMAIL_API_BASE_URL, useValue: baseUrl },
    ],
  }).compile()

  return module.get(GmailService)
}

async function mockLabel(params: {
  labelId: string
  token: string
  response: object
  statusCode?: number
}): Promise<void> {
  await mockserver.createExpectation({
    httpRequest: {
      path: `/gmail/v1/users/me/labels/${encodeURIComponent(params.labelId)}`,
      method: "GET",
      headers: {
        Authorization: [`Bearer ${params.token}`],
      },
    },
    httpResponse: {
      statusCode: params.statusCode ?? 200,
      body: {
        type: MockserverBodyTypes.Json,
        json: JSON.stringify(params.response),
        matchType: MockserverMatchTypes.OnlyMatchingFields,
      },
    },
    times: { remainingTimes: 1 },
  })
}

describe("GmailService", () => {
  describe("getLabelStats()", () => {
    describe("Given a valid token and label", () => {
      it("should return messageCount and unreadCount from the Gmail response", async () => {
        const service = await buildService()
        const token = faker.string.alphanumeric(40)
        const labelId = "INBOX"
        const label = gmailFakes.label({
          id: labelId,
          messagesTotal: 1234,
          messagesUnread: 56,
        })
        await mockLabel({ labelId, token, response: label })

        const stats = await service.getLabelStats(token, labelId)

        expect(stats).toEqual({ messageCount: 1234, unreadCount: 56 })
      })

      it("should rename Gmail's messagesTotal/messagesUnread to messageCount/unreadCount", async () => {
        const service = await buildService()
        const token = faker.string.alphanumeric(40)
        const labelId = "Label_42"
        const messagesTotal = faker.number.int({ min: 1, max: 10000 })
        const messagesUnread = faker.number.int({ min: 0, max: 500 })
        const label = gmailFakes.label({
          id: labelId,
          name: "Receipts",
          type: "user",
          messagesTotal,
          messagesUnread,
        })
        await mockLabel({ labelId, token, response: label })

        const stats = await service.getLabelStats(token, labelId)

        expect(stats.messageCount).toBe(messagesTotal)
        expect(stats.unreadCount).toBe(messagesUnread)
      })
    })

    describe("Given Gmail returns a 401 (invalid or expired token)", () => {
      it("should throw an error mentioning the status and label", async () => {
        const service = await buildService()
        const token = faker.string.alphanumeric(40)
        const labelId = "INBOX"
        await mockLabel({
          labelId,
          token,
          statusCode: 401,
          response: { error: { code: 401, message: "Invalid Credentials" } },
        })

        await expect(service.getLabelStats(token, labelId)).rejects.toThrow(
          /401.*INBOX|INBOX.*401/,
        )
      })
    })

    describe("Given Gmail returns a 404 (unknown label)", () => {
      it("should throw an error mentioning the status and label", async () => {
        const service = await buildService()
        const token = faker.string.alphanumeric(40)
        const labelId = "Label_DoesNotExist"
        await mockLabel({
          labelId,
          token,
          statusCode: 404,
          response: { error: { code: 404, message: "Not Found" } },
        })

        await expect(service.getLabelStats(token, labelId)).rejects.toThrow(
          /404.*Label_DoesNotExist|Label_DoesNotExist.*404/,
        )
      })
    })
  })
})
