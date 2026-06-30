import { faker } from "@faker-js/faker"
import { type ExecutionContext } from "@nestjs/common"
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants"
import { type CustomParamFactory } from "@nestjs/common/interfaces"

import { type GmailLabelStats } from "../services/gmail.service"

import { MailboxStats } from "./mailbox-stats.decorator"
import { MAILBOX_STATS_METADATA_KEY } from "./with-mailbox-stats.decorator"

type Args = Record<string, { factory: CustomParamFactory }>

const stats: GmailLabelStats = {
  messageCount: faker.number.int({ min: 1, max: 10000 }),
  unreadCount: faker.number.int({ min: 0, max: 500 }),
}

class MailboxStatsDecoratorTest {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public test(@MailboxStats() _value: GmailLabelStats): void {}
}

const buildContext = (
  handler: (...args: any[]) => any,
  req: { mailboxStats?: GmailLabelStats } = {},
): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => handler,
  }) as unknown as ExecutionContext

describe("MailboxStatsDecorator", () => {
  let factory: CustomParamFactory

  beforeAll(() => {
    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      MailboxStatsDecoratorTest,
      "test",
    ) as Args

    factory = args[Object.keys(args)[0]].factory
  })

  describe("Given @WithMailboxStats is applied to the handler", () => {
    const handler = (): void => {}

    beforeAll(() => {
      Reflect.defineMetadata(MAILBOX_STATS_METADATA_KEY, true, handler)
    })

    it("should return the stats from the request", () => {
      expect(
        factory(null, buildContext(handler, { mailboxStats: stats })),
      ).toBe(stats)
    })
  })

  describe("Given @WithMailboxStats is not applied to the handler", () => {
    const handler = (): void => {}

    it("should throw an Error pointing at the missing @WithMailboxStats() wiring", () => {
      expect(() => factory(null, buildContext(handler))).toThrowMatching(
        Error,
        {
          message:
            "@WithMailboxStats() must be applied to routes using @MailboxStats()",
        },
      )
    })
  })
})
