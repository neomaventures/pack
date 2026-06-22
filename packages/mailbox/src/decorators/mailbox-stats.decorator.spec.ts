import { faker } from "@faker-js/faker"
import { type ExecutionContext } from "@nestjs/common"
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants"
import { type CustomParamFactory } from "@nestjs/common/interfaces"

import { MailboxStatsUnavailableException } from "../exceptions/mailbox-stats-unavailable.exception"
import { type GmailLabelStats } from "../services/gmail.service"

import { MailboxStats } from "./mailbox-stats.decorator"

type Args = Record<string, { factory: CustomParamFactory }>

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

describe("MailboxStatsDecorator", () => {
  let factory: CustomParamFactory

  beforeAll(() => {
    class MailboxStatsDecoratorTest {
      // eslint-disable-next-line
      public test(@MailboxStats() _value: GmailLabelStats): void {}
    }

    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      MailboxStatsDecoratorTest,
      "test",
    ) as Args

    factory = args[Object.keys(args)[0]].factory
  })

  describe("Given the middleware has populated req.mailboxStats", () => {
    it("should return the stats from the request", () => {
      expect(factory(null, buildContext({ mailboxStats: stats }))).toEqual(
        stats,
      )
    })
  })

  describe("Given req.mailboxStats is missing", () => {
    it("should throw MailboxStatsUnavailableException", () => {
      expect(() => factory(null, buildContext({}))).toThrow(
        MailboxStatsUnavailableException,
      )
    })
  })
})
