import { faker } from "@faker-js/faker"
import { callHandler, executionContext, express } from "@neomaventures/fixtures"
import { type ExecutionContext } from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"

import { type MailboxStats } from "../interfaces/mailbox-stats"
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
    it("should populate req.mailboxStats with the resolved stats", async () => {
      const stats: MailboxStats = {
        labelId: faker.string.alphanumeric(10),
        messageCount: faker.number.int({ min: 1, max: 10000 }),
        unreadCount: faker.number.int({ min: 0, max: 500 }),
      }
      mailbox.getStats.mockResolvedValue(stats)
      const req = express.request()

      await interceptor.intercept(
        executionContext(req) as ExecutionContext,
        callHandler(),
      )

      expect(req.mailboxStats).toEqual(stats)
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
