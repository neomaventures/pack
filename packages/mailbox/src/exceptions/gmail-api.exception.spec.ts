import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { GmailApiException } from "./gmail-api.exception"

describe("GmailApiException", () => {
  const endpoint = "/gmail/v1/users/me/labels/{labelId}"

  describe("Given an upstream 401", () => {
    const labelId = faker.string.alphanumeric(10)
    const message = faker.lorem.sentence()
    const responseBody = {
      error: { code: 401, message: "Invalid Credentials" },
    }
    let exception: GmailApiException

    beforeEach(() => {
      exception = new GmailApiException(
        401,
        endpoint,
        message,
        { labelId },
        responseBody,
      )
    })

    it("should expose the endpoint property", () => {
      expect(exception.endpoint).toBe(endpoint)
    })

    it("should expose the context property carrying labelId", () => {
      expect(exception.context).toEqual({ labelId })
    })

    it("should expose the responseBody property", () => {
      expect(exception.responseBody).toEqual(responseBody)
    })

    it("should return HTTP 401 Unauthorized", () => {
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED)
    })

    it("should produce the stable response shape", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: HttpStatus.UNAUTHORIZED,
        message,
        endpoint,
        context: { labelId },
        responseBody,
        error: "GmailApi",
      })
    })
  })

  describe("Given an upstream 404", () => {
    const labelId = faker.string.alphanumeric(10)
    const message = faker.lorem.sentence()
    const responseBody = { error: { code: 404, message: "Not Found" } }
    let exception: GmailApiException

    beforeEach(() => {
      exception = new GmailApiException(
        404,
        endpoint,
        message,
        { labelId },
        responseBody,
      )
    })

    it("should return HTTP 404 Not Found", () => {
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND)
    })

    it("should produce the stable response shape", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: HttpStatus.NOT_FOUND,
        message,
        endpoint,
        context: { labelId },
        responseBody,
        error: "GmailApi",
      })
    })
  })

  describe("Given a cause", () => {
    it("should chain the cause via Error.cause", () => {
      const cause = new Error(faker.lorem.sentence())

      const exception = new GmailApiException(
        500,
        endpoint,
        faker.lorem.sentence(),
        { labelId: faker.string.alphanumeric(10) },
        null,
        cause,
      )

      expect(exception.cause).toBe(cause)
    })
  })

  describe.each([500, 502, 503, 429, 418])(
    "Given an upstream %i",
    (upstreamStatus) => {
      it("should map to HTTP 502 Bad Gateway", () => {
        const exception = new GmailApiException(
          upstreamStatus,
          endpoint,
          faker.lorem.sentence(),
          { labelId: faker.string.alphanumeric(10) },
          null,
        )

        expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY)
      })
    },
  )
})
