import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { GoogleTokenException } from "./google-token.exception"

describe("GoogleTokenException", () => {
  const reason = faker.lorem.sentence()
  let exception: GoogleTokenException

  beforeEach(() => {
    exception = new GoogleTokenException(reason)
  })

  it("should have the reason property", () => {
    expect(exception.reason).toBe(reason)
  })

  it("should return HTTP 401 Unauthorized", () => {
    expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED)
  })

  it("should include reason in the response body", () => {
    expect(exception.getResponse()).toMatchObject({
      statusCode: HttpStatus.UNAUTHORIZED,
      message: `Google ID token error: ${reason}`,
      reason,
      error: "Unauthorized",
    })
  })

  it("should have the correct message", () => {
    expect(exception.message).toBe(`Google ID token error: ${reason}`)
  })
})
