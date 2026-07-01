import { faker } from "@faker-js/faker"
import { callHandler, executionContext, express } from "@neomaventures/fixtures"
import { type ExecutionContext } from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"

import { type MailboxFolderStats } from "../interfaces/mailbox-folder-stats"
import { MailboxService } from "../services/mailbox.service"

import { MailboxStatsInterceptor } from "./mailbox-stats.interceptor"

describe("MailboxStatsInterceptor", () => {
  let interceptor: MailboxStatsInterceptor
  let mailbox: { getStats: jest.Mock }

  beforeEach(async () => {
    mailbox = { getStats: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailboxStatsInterceptor,
        { provide: MailboxService, useValue: mailbox },
      ],
    }).compile()

    interceptor = module.get(MailboxStatsInterceptor)
  })

  describe("Given MailboxService.getStats resolves", () => {
    let stats: MailboxFolderStats
    let req: ReturnType<typeof express.request>
    let res: ReturnType<typeof express.response>

    beforeEach(async () => {
      stats = {
        folder: faker.string.alphanumeric(10),
        messageCount: faker.number.int({ min: 1, max: 10000 }),
        unreadCount: faker.number.int({ min: 0, max: 500 }),
      }
      mailbox.getStats.mockResolvedValue(stats)
      res = express.response()
      req = express.request({ res })

      await interceptor.intercept(
        executionContext(req, res) as ExecutionContext,
        callHandler(),
      )
    })

    it("should populate req.mailboxStats with the resolved stats", () => {
      expect(req.mailboxStats).toEqual(stats)
    })

    it("should mirror the resolved stats to res.locals.mailboxStats", () => {
      expect(res.locals.mailboxStats).toEqual(stats)
    })
  })

  describe("Given MailboxService.getStats resolves null", () => {
    let req: ReturnType<typeof express.request>
    let res: ReturnType<typeof express.response>
    let next: ReturnType<typeof callHandler>
    let handleSpy: jest.SpyInstance

    beforeEach(async () => {
      mailbox.getStats.mockResolvedValue(null)
      res = express.response()
      req = express.request({ res })
      next = callHandler()
      handleSpy = jest.spyOn(next, "handle")

      await interceptor.intercept(
        executionContext(req, res) as ExecutionContext,
        next,
      )
    })

    it("should populate req.mailboxStats with null", () => {
      expect(req.mailboxStats).toBeNull()
    })

    it("should mirror null to res.locals.mailboxStats", () => {
      expect(res.locals.mailboxStats).toBeNull()
    })

    it("should still invoke next.handle()", () => {
      expect(handleSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe("Given MailboxService.getStats rejects", () => {
    it("should re-throw the underlying exception", async () => {
      const error = new Error(faker.lorem.sentence())
      mailbox.getStats.mockRejectedValue(error)

      await expect(
        interceptor.intercept(
          executionContext(express.request()) as ExecutionContext,
          callHandler(),
        ),
      ).rejects.toBe(error)
    })
  })
})
