import { INTERCEPTORS_METADATA } from "@nestjs/common/constants"

import { MailboxStatsInterceptor } from "../interceptors/mailbox-stats.interceptor"

import {
  MAILBOX_STATS_METADATA_KEY,
  WithMailboxStats,
} from "./with-mailbox-stats.decorator"

describe("WithMailboxStats", () => {
  class TestController {
    @WithMailboxStats()
    public handler(): void {}
  }

  it("should stamp MAILBOX_STATS_METADATA_KEY on the method", () => {
    const metadata = Reflect.getMetadata(
      MAILBOX_STATS_METADATA_KEY,
      TestController.prototype.handler,
    )

    expect(metadata).toBe(true)
  })

  it("should attach the MailboxStatsInterceptor to the method", () => {
    const interceptors = Reflect.getMetadata(
      INTERCEPTORS_METADATA,
      TestController.prototype.handler,
    )

    expect(interceptors).toContain(MailboxStatsInterceptor)
  })
})
