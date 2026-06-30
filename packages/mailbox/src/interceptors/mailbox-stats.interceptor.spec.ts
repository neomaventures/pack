import { faker } from "@faker-js/faker"
import { type CallHandler, type ExecutionContext } from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"
import { lastValueFrom, of, type Observable } from "rxjs"

import { type GmailLabelStats } from "../services/gmail.service"
import { MailboxService } from "../services/mailbox.service"

import { MailboxStatsInterceptor } from "./mailbox-stats.interceptor"

const stats: GmailLabelStats = {
  messageCount: faker.number.int({ min: 1, max: 10000 }),
  unreadCount: faker.number.int({ min: 0, max: 500 }),
}

const buildContext = (req: {
  mailboxStats?: GmailLabelStats
}): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => req }),
  }) as unknown as ExecutionContext

describe("MailboxStatsInterceptor", () => {
  let interceptor: MailboxStatsInterceptor
  let mailbox: { getStats: jest.Mock }
  let req: { mailboxStats?: GmailLabelStats }
  let next: CallHandler

  beforeEach(async () => {
    mailbox = { getStats: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailboxStatsInterceptor,
        { provide: MailboxService, useValue: mailbox },
      ],
    }).compile()

    interceptor = module.get(MailboxStatsInterceptor)
    req = {}
    next = {
      handle: jest.fn(() => of("handler-response") as Observable<unknown>),
    }
  })

  describe("Given MailboxService.getStats resolves", () => {
    beforeEach(() => {
      mailbox.getStats.mockResolvedValue(stats)
    })

    it("should populate req.mailboxStats with the resolved stats", async () => {
      await interceptor.intercept(buildContext(req), next)

      expect(req.mailboxStats).toEqual(stats)
    })

    it("should call next.handle() and pass through its response", async () => {
      const result = await lastValueFrom(
        await interceptor.intercept(buildContext(req), next),
      )

      expect(result).toBe("handler-response")
    })
  })

  describe("Given MailboxService.getStats rejects", () => {
    const error = new Error(faker.lorem.sentence())

    beforeEach(() => {
      mailbox.getStats.mockRejectedValue(error)
    })

    it("should re-throw the underlying exception", async () => {
      await expect(interceptor.intercept(buildContext(req), next)).rejects.toBe(
        error,
      )
    })

    it("should not call next.handle()", async () => {
      await expect(interceptor.intercept(buildContext(req), next)).rejects.toBe(
        error,
      )

      expect(next.handle).not.toHaveBeenCalled()
    })

    it("should leave req.mailboxStats undefined", async () => {
      await expect(interceptor.intercept(buildContext(req), next)).rejects.toBe(
        error,
      )

      expect(req.mailboxStats).toBeUndefined()
    })
  })
})
