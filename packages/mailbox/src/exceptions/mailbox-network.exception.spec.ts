import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { MailboxNetworkException } from "./mailbox-network.exception"

describe("MailboxNetworkException", () => {
  const endpoint = "/gmail/v1/users/me/labels/{labelId}"
  const context = { labelId: faker.string.alphanumeric(10) }
  const cause = new Error(faker.lorem.sentence())
  let exception: MailboxNetworkException

  beforeEach(() => {
    exception = new MailboxNetworkException(endpoint, context, cause)
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
      error: "MailboxNetwork",
    })
  })

  describe("name", () => {
    it('should set this.name to "MailboxNetworkException"', () => {
      expect(exception.name).toBe("MailboxNetworkException")
    })
  })
})
