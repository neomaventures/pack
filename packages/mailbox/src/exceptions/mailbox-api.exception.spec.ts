import { faker } from "@faker-js/faker"
import { HttpException, HttpStatus } from "@nestjs/common"

import { MailboxApiException } from "./mailbox-api.exception"

const buildCause = (
  status: number,
  message: string = faker.lorem.sentence(),
  body: unknown = { error: { code: status, message } },
): HttpException =>
  new HttpException({ statusCode: status, message, body }, status)

describe("MailboxApiException", () => {
  const endpoint = "/gmail/v1/users/me/labels/{labelId}"

  describe("Given an upstream 401", () => {
    const labelId = faker.string.alphanumeric(10)
    const message = faker.lorem.sentence()
    let cause: HttpException
    let exception: MailboxApiException

    beforeEach(() => {
      cause = buildCause(401, message)
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

    it("should return HTTP 401 Unauthorized", () => {
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED)
    })

    it("should produce the minimal wire response shape", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: HttpStatus.UNAUTHORIZED,
        message,
        error: "MailboxApi",
      })
    })
  })

  describe("Given an upstream 404", () => {
    const labelId = faker.string.alphanumeric(10)
    const message = faker.lorem.sentence()
    let exception: MailboxApiException

    beforeEach(() => {
      exception = new MailboxApiException(
        endpoint,
        { labelId },
        buildCause(404, message),
      )
    })

    it("should return HTTP 404 Not Found", () => {
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND)
    })

    it("should produce the minimal wire response shape", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: HttpStatus.NOT_FOUND,
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
        buildCause(500),
      )

      expect(exception.name).toBe("MailboxApiException")
    })
  })

  describe.each([500, 502, 503, 429, 418, 200])(
    "Given an upstream %i",
    (upstreamStatus) => {
      it("should map to HTTP 502 Bad Gateway", () => {
        const exception = new MailboxApiException(
          endpoint,
          { labelId: faker.string.alphanumeric(10) },
          buildCause(upstreamStatus),
        )

        expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY)
      })
    },
  )
})
