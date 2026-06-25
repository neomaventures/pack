import { faker } from "@faker-js/faker"
import { Test, type TestingModule } from "@nestjs/testing"
import { type Request, type Response } from "express"

import { type GmailLabelStats } from "../services/gmail.service"
import { MailboxService } from "../services/mailbox.service"

import { MailboxStatsMiddleware } from "./mailbox-stats.middleware"

const stats: GmailLabelStats = {
  messageCount: faker.number.int({ min: 1, max: 10000 }),
  unreadCount: faker.number.int({ min: 0, max: 500 }),
}

describe("MailboxStatsMiddleware", () => {
  let middleware: MailboxStatsMiddleware
  let mailbox: { getStats: jest.Mock }
  let req: Request & { mailboxStats?: GmailLabelStats }
  let res: Response
  let next: jest.Mock

  beforeEach(async () => {
    mailbox = { getStats: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailboxStatsMiddleware,
        { provide: MailboxService, useValue: mailbox },
      ],
    }).compile()

    middleware = module.get(MailboxStatsMiddleware)
    req = {} as Request & { mailboxStats?: GmailLabelStats }
    res = {} as Response
    next = jest.fn()
  })

  describe("Given MailboxService.getStats resolves", () => {
    beforeEach(() => {
      mailbox.getStats.mockResolvedValue(stats)
    })

    it("should populate req.mailboxStats with the resolved stats", async () => {
      await middleware.use(req, res, next)

      expect(req.mailboxStats).toEqual(stats)
    })

    it("should call next()", async () => {
      await middleware.use(req, res, next)

      expect(next).toHaveBeenCalledTimes(1)
    })
  })

  describe("Given MailboxService.getStats rejects", () => {
    const error = new Error(faker.lorem.sentence())

    beforeEach(() => {
      mailbox.getStats.mockRejectedValue(error)
    })

    it("should re-throw the underlying exception", async () => {
      await expect(middleware.use(req, res, next)).rejects.toBe(error)
    })

    it("should not call next()", async () => {
      await expect(middleware.use(req, res, next)).rejects.toBe(error)

      expect(next).not.toHaveBeenCalled()
    })

    it("should leave req.mailboxStats undefined", async () => {
      await expect(middleware.use(req, res, next)).rejects.toBe(error)

      expect(req.mailboxStats).toBeUndefined()
    })
  })
})
