import { faker } from "@faker-js/faker"
import { HttpException, HttpStatus } from "@nestjs/common"

import { AuthApiException } from "./auth-api.exception"

describe("AuthApiException", () => {
  const endpoint = "/oauth/token"
  const context = { provider: "google", phase: "codeExchange" }

  describe("Given any upstream cause", () => {
    const causeMessage = faker.lorem.sentence()
    const body = { error: "invalid_grant" }
    let cause: HttpException
    let exception: AuthApiException

    beforeEach(() => {
      cause = new HttpException(
        { statusCode: 401, message: causeMessage, body },
        401,
      )
      exception = new AuthApiException(endpoint, context, cause)
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
    it('should set this.name to "AuthApiException"', () => {
      const exception = new AuthApiException(
        endpoint,
        context,
        new HttpException(faker.lorem.sentence(), 500),
      )

      expect(exception.name).toBe("AuthApiException")
    })
  })

  describe.each([401, 404, 500, 502, 503, 429, 418, 200])(
    "Given an upstream %i cause",
    (upstreamStatus) => {
      it("should always return HTTP 502 Bad Gateway", () => {
        const exception = new AuthApiException(
          endpoint,
          context,
          new HttpException(faker.lorem.sentence(), upstreamStatus),
        )

        expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY)
      })

      it("should produce an opaque wire response that does not leak upstream status or message", () => {
        const exception = new AuthApiException(
          endpoint,
          context,
          new HttpException(faker.lorem.sentence(), upstreamStatus),
        )

        expect(exception.getResponse()).toEqual({
          statusCode: HttpStatus.BAD_GATEWAY,
          message: "Bad Gateway",
          error: "AuthApi",
        })
      })
    },
  )
})
