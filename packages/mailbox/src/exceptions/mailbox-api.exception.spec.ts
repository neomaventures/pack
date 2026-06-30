import { faker } from "@faker-js/faker"
import { HttpException, HttpStatus } from "@nestjs/common"

import { MailboxApiException } from "./mailbox-api.exception"

describe("MailboxApiException", () => {
  const endpoint = "/gmail/v1/users/me/labels/{labelId}"
  const context = { labelId: faker.string.alphanumeric(10) }

  describe("Given any upstream cause", () => {
    const causeMessage = faker.lorem.sentence()
    const body = { error: "notFound" }
    let cause: HttpException
    let exception: MailboxApiException

    beforeEach(() => {
      cause = new HttpException(
        { statusCode: 404, message: causeMessage, body },
        404,
      )
      exception = new MailboxApiException(endpoint, context, cause)
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

    it("should preserve the cause message on err.cause.message (not on err.message)", () => {
      expect((exception.cause as HttpException).message).toBe(causeMessage)
    })
  })

  describe("name", () => {
    it('should set this.name to "MailboxApiException"', () => {
      const exception = new MailboxApiException(
        endpoint,
        context,
        new HttpException(faker.lorem.sentence(), 500),
      )

      expect(exception.name).toBe("MailboxApiException")
    })
  })

  describe.each([401, 404, 500, 502, 503, 429, 418, 200])(
    "Given an upstream %i cause",
    (upstreamStatus) => {
      it("should always return HTTP 502 Bad Gateway", () => {
        const exception = new MailboxApiException(
          endpoint,
          context,
          new HttpException(faker.lorem.sentence(), upstreamStatus),
        )

        expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY)
      })

      it("should produce an opaque wire response that does not leak upstream status or message", () => {
        const exception = new MailboxApiException(
          endpoint,
          context,
          new HttpException(faker.lorem.sentence(), upstreamStatus),
        )

        expect(exception.getResponse()).toEqual({
          statusCode: HttpStatus.BAD_GATEWAY,
          message: "Bad Gateway",
          error: "MailboxApi",
        })
      })
    },
  )
})
