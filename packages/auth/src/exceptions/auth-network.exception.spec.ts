import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { AuthNetworkException } from "./auth-network.exception"

describe("AuthNetworkException", () => {
  const endpoint = "/oauth/token"
  const context = { provider: "google", phase: "codeExchange" }
  const cause = new Error(faker.lorem.sentence())
  let exception: AuthNetworkException

  beforeEach(() => {
    exception = new AuthNetworkException(endpoint, context, cause)
  })

  it("should expose the endpoint property on the instance", () => {
    expect(exception.endpoint).toBe(endpoint)
  })

  it("should expose the context property on the instance", () => {
    expect(exception.context).toEqual(context)
  })

  it("should chain the cause via Error.cause", () => {
    expect(exception.cause).toBe(cause)
  })

  it("should return HTTP 502 Bad Gateway", () => {
    expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY)
  })

  it("should produce an opaque wire response that does not leak cause details", () => {
    expect(exception.getResponse()).toEqual({
      statusCode: HttpStatus.BAD_GATEWAY,
      message: "Bad Gateway",
      error: "AuthNetwork",
    })
  })

  describe("name", () => {
    it('should set this.name to "AuthNetworkException"', () => {
      expect(exception.name).toBe("AuthNetworkException")
    })
  })
})
