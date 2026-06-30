import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { InvalidMagicLinkTokenException } from "./invalid-magic-link-token.exception"

describe("InvalidMagicLinkTokenException", () => {
  const reason = faker.lorem.sentence()
  let exception: InvalidMagicLinkTokenException

  beforeEach(() => {
    exception = new InvalidMagicLinkTokenException(reason)
  })

  it("should expose the reason property on the instance", () => {
    expect(exception.reason).toBe(reason)
  })

  it("should return HTTP 401 Unauthorized", () => {
    expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED)
  })

  it("should produce the minimal wire response shape", () => {
    expect(exception.getResponse()).toEqual({
      statusCode: HttpStatus.UNAUTHORIZED,
      message: `Invalid magic link token: ${reason}`,
      error: "Unauthorized",
    })
  })

  it("should have the correct message", () => {
    expect(exception.message).toBe(`Invalid magic link token: ${reason}`)
  })
})
