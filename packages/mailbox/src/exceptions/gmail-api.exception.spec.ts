import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { GmailApiException } from "./gmail-api.exception"

describe("GmailApiException", () => {
  describe("Given an upstream 401", () => {
    const labelId = faker.string.alphanumeric(10)
    const message = faker.lorem.sentence()
    let exception: GmailApiException

    beforeEach(() => {
      exception = new GmailApiException(401, labelId, message)
    })

    it("should expose the labelId property", () => {
      expect(exception.labelId).toBe(labelId)
    })

    it("should return HTTP 401 Unauthorized", () => {
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED)
    })

    it("should produce the stable response shape", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: HttpStatus.UNAUTHORIZED,
        message,
        labelId,
        error: "GmailApi",
      })
    })
  })

  describe("Given an upstream 404", () => {
    const labelId = faker.string.alphanumeric(10)
    const message = faker.lorem.sentence()
    let exception: GmailApiException

    beforeEach(() => {
      exception = new GmailApiException(404, labelId, message)
    })

    it("should return HTTP 404 Not Found", () => {
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND)
    })

    it("should produce the stable response shape", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: HttpStatus.NOT_FOUND,
        message,
        labelId,
        error: "GmailApi",
      })
    })
  })

  describe.each([500, 502, 503, 429, 418])(
    "Given an upstream %i",
    (upstreamStatus) => {
      it("should map to HTTP 502 Bad Gateway", () => {
        const exception = new GmailApiException(
          upstreamStatus,
          faker.string.alphanumeric(10),
          faker.lorem.sentence(),
        )

        expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY)
      })
    },
  )
})
