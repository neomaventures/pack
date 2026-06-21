import { faker } from "@faker-js/faker"
import { Injectable } from "@nestjs/common"
import { ModuleRef } from "@nestjs/core"
import { Test, type TestingModule } from "@nestjs/testing"

import { GMAIL_READONLY_SCOPE, GmailSystemLabel } from "../constants"
import { type TokenAccessor } from "../interfaces/token-accessor.interface"
import {
  type ResolvedMailboxOptions,
  RESOLVED_MAILBOX_OPTIONS,
} from "../mailbox.options"

import { GmailService } from "./gmail.service"
import { MailboxService } from "./mailbox.service"

const token = faker.string.alphanumeric(40)
const messageCount = faker.number.int({ min: 1, max: 10000 })
const unreadCount = faker.number.int({ min: 0, max: 500 })

@Injectable()
class StubTokenAccessor implements TokenAccessor {
  public async getToken(): Promise<string> {
    return token
  }
}

const account = {
  id: faker.string.uuid(),
  accountId: faker.string.uuid(),
  gmailAddress: faker.internet.email().toLowerCase(),
}

describe("MailboxService", () => {
  let service: MailboxService
  let gmailService: { getStats: jest.Mock }
  let tokenAccessor: StubTokenAccessor
  let getTokenSpy: jest.SpyInstance

  beforeEach(async () => {
    gmailService = {
      getStats: jest.fn().mockResolvedValue({ messageCount, unreadCount }),
    }

    const resolvedOptions: ResolvedMailboxOptions = {
      tokenAccessor: StubTokenAccessor,
      entity: class {} as any,
      gmailApiBaseUrl: faker.internet.url(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailboxService,
        StubTokenAccessor,
        { provide: GmailService, useValue: gmailService },
        { provide: RESOLVED_MAILBOX_OPTIONS, useValue: resolvedOptions },
      ],
    }).compile()

    // Mirror ModuleRef.create() by returning the StubTokenAccessor instance
    // registered as a provider in the test module. The real ModuleRef.create
    // path is exercised by the e2e spec.
    tokenAccessor = module.get(StubTokenAccessor)
    getTokenSpy = jest.spyOn(tokenAccessor, "getToken")
    const moduleRef = module.get(ModuleRef)
    jest.spyOn(moduleRef, "create").mockResolvedValue(tokenAccessor)

    service = module.get(MailboxService)
    await service.onModuleInit()
  })

  describe("getStats()", () => {
    describe("Given a token accessor and gmail service", () => {
      it("should request a token with the gmail.readonly scope", async () => {
        await service.getStats(account)

        expect(getTokenSpy).toHaveBeenCalledWith(account, [
          GMAIL_READONLY_SCOPE,
        ])
      })

      it("should delegate to GmailService.getStats with the resolved token and INBOX label", async () => {
        await service.getStats(account)

        expect(gmailService.getStats).toHaveBeenCalledWith(
          token,
          GmailSystemLabel.Inbox,
        )
      })

      it("should return the stats from GmailService unchanged", async () => {
        await expect(service.getStats(account)).resolves.toEqual({
          messageCount,
          unreadCount,
        })
      })
    })
  })
})
