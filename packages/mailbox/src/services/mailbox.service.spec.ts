import { faker } from "@faker-js/faker"
import { Test, type TestingModule } from "@nestjs/testing"

import { GMAIL_READONLY_SCOPE, MailboxFolder } from "../constants"
import { type TokenAccessor } from "../interfaces/token-accessor.interface"
import { TOKEN_ACCESSOR } from "../mailbox.options"
import { GmailService } from "../providers/gmail/gmail.service"

import { MailboxService } from "./mailbox.service"

const token = faker.string.alphanumeric(40)
const folder = MailboxFolder.Inbox
const messageCount = faker.number.int({ min: 1, max: 10000 })
const unreadCount = faker.number.int({ min: 0, max: 500 })

describe("MailboxService", () => {
  let service: MailboxService
  let gmailService: { getStats: jest.Mock }
  let tokenAccessor: TokenAccessor
  let getTokenSpy: jest.Mock

  beforeEach(async () => {
    gmailService = {
      getStats: jest
        .fn()
        .mockResolvedValue({ folder, messageCount, unreadCount }),
    }

    getTokenSpy = jest.fn().mockResolvedValue(token)
    tokenAccessor = { getToken: getTokenSpy }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailboxService,
        { provide: GmailService, useValue: gmailService },
        { provide: TOKEN_ACCESSOR, useValue: tokenAccessor },
      ],
    }).compile()

    service = module.get(MailboxService)
  })

  describe("getStats()", () => {
    describe("Given a token accessor and gmail service", () => {
      it("should request a token with the gmail.readonly scope", async () => {
        await service.getStats()

        expect(getTokenSpy).toHaveBeenCalledWith(GMAIL_READONLY_SCOPE)
      })

      it("should delegate to GmailService.getStats with the resolved token and INBOX folder", async () => {
        await service.getStats()

        expect(gmailService.getStats).toHaveBeenCalledWith(
          token,
          MailboxFolder.Inbox,
        )
      })

      it("should return the stats from GmailService unchanged", async () => {
        await expect(service.getStats()).resolves.toEqual({
          folder,
          messageCount,
          unreadCount,
        })
      })
    })

    describe("Given an explicit folder argument", () => {
      it("should pass the folder through to GmailService.getStats", async () => {
        const customFolder = faker.string.alphanumeric(10)

        await service.getStats(customFolder)

        expect(gmailService.getStats).toHaveBeenCalledWith(token, customFolder)
      })
    })
  })
})
