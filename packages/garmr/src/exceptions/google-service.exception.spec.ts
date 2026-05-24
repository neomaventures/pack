import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { GoogleServiceException } from "./google-service.exception"

describe("GoogleServiceException", () => {
  const reason = faker.lorem.sentence()
  let exception: GoogleServiceException

  beforeEach(() => {
    exception = new GoogleServiceException(reason)
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
      message: `Google service error: ${reason}`,
      reason,
      error: "Bad Gateway",
    })
  })

  it("should have the correct message", () => {
    expect(exception.message).toBe(`Google service error: ${reason}`)
  })
})
