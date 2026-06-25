import { HttpStatus } from "@nestjs/common"

import { MailboxStatsUnavailableException } from "./mailbox-stats-unavailable.exception"

describe("MailboxStatsUnavailableException", () => {
  let exception: MailboxStatsUnavailableException

  beforeEach(() => {
    exception = new MailboxStatsUnavailableException()
  })

  it("should return HTTP 502 Bad Gateway", () => {
    expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY)
  })

  it("should produce the minimal wire response shape", () => {
    expect(exception.getResponse()).toEqual({
      statusCode: HttpStatus.BAD_GATEWAY,
      message: "Mailbox stats are not available for the current request.",
      error: "MailboxStatsUnavailable",
    })
  })
})
