import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { GoogleNetworkException } from "./google-network.exception"

describe("GoogleNetworkException", () => {
  const reason = faker.lorem.sentence()
  let exception: GoogleNetworkException

  beforeEach(() => {
    exception = new GoogleNetworkException(reason)
  })

  it("should have the reason property", () => {
    expect(exception.reason).toBe(reason)
  })

  it("should return HTTP 502 Bad Gateway", () => {
    expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY)
  })

  it("should include reason in the response body", () => {
    expect(exception.getResponse()).toMatchObject({
      statusCode: HttpStatus.BAD_GATEWAY,
      message: `Google authentication network error: ${reason}`,
      reason,
      error: "Bad Gateway",
    })
  })

  it("should have the correct message", () => {
    expect(exception.message).toBe(
      `Google authentication network error: ${reason}`,
    )
  })
})
