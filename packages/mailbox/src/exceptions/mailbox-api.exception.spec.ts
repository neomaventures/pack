import { faker } from "@faker-js/faker"
import { HttpException, HttpStatus } from "@nestjs/common"

import { MailboxApiException } from "./mailbox-api.exception"

describe("MailboxApiException", () => {
  const endpoint = "/gmail/v1/users/me/labels/{labelId}"

  describe.each([
    HttpStatus.UNAUTHORIZED,
    HttpStatus.NOT_FOUND,
    HttpStatus.INTERNAL_SERVER_ERROR,
    HttpStatus.BAD_GATEWAY,
    HttpStatus.SERVICE_UNAVAILABLE,
    HttpStatus.TOO_MANY_REQUESTS,
  ])("Given an upstream status of %i", (upstreamStatus) => {
    const labelId = faker.string.alphanumeric(10)
    const message = faker.lorem.sentence()
    let cause: HttpException
    let exception: MailboxApiException

    beforeEach(() => {
      cause = new HttpException(
        { statusCode: upstreamStatus, message },
        upstreamStatus,
      )
      exception = new MailboxApiException(endpoint, { labelId }, cause)
    })

    it("should expose the endpoint property on the instance", () => {
      expect(exception.endpoint).toBe(endpoint)
    })

    it("should expose the context property on the instance", () => {
      expect(exception.context).toEqual({ labelId })
    })

    it("should chain the cause via Error.cause", () => {
      expect(exception.cause).toBe(cause)
    })

    it("should return HTTP 502 Bad Gateway regardless of upstream", () => {
      expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY)
    })

    it("should produce the minimal wire response shape", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: HttpStatus.BAD_GATEWAY,
        message,
        error: "MailboxApi",
      })
    })
  })

  describe("name", () => {
    it('should have name "MailboxApiException"', () => {
      const exception = new MailboxApiException(
        endpoint,
        { labelId: faker.string.alphanumeric(10) },
        new HttpException(
          {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: faker.lorem.sentence(),
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      )

      expect(exception.name).toBe("MailboxApiException")
    })
  })
})
