import { faker } from "@faker-js/faker"
import { HttpException, HttpStatus } from "@nestjs/common"

import { AuthApiException } from "./auth-api.exception"

describe("AuthApiException", () => {
  const endpoint = "/oauth/token"
  const context = { provider: "google", phase: "codeExchange" }

  describe("Given an upstream 401 cause", () => {
    const message = faker.lorem.sentence()
    const body = { error: "invalid_grant" }
    let cause: HttpException
    let exception: AuthApiException

    beforeEach(() => {
      cause = new HttpException({ statusCode: 401, message, body }, 401)
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

    it("should return HTTP 401 Unauthorized (passthrough)", () => {
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED)
    })

    it("should produce the minimal wire response shape", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: HttpStatus.UNAUTHORIZED,
        message,
        error: "AuthApi",
      })
    })

    it("should inherit the message from the cause", () => {
      expect(exception.message).toBe(message)
    })
  })

  describe("Given an upstream 404 cause", () => {
    const message = faker.lorem.sentence()
    let exception: AuthApiException

    beforeEach(() => {
      exception = new AuthApiException(
        endpoint,
        context,
        new HttpException({ statusCode: 404, message }, 404),
      )
    })

    it("should return HTTP 404 Not Found (passthrough)", () => {
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND)
    })

    it("should produce the minimal wire response shape", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: HttpStatus.NOT_FOUND,
        message,
        error: "AuthApi",
      })
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

  describe.each([500, 502, 503, 429, 418, 200])(
    "Given an upstream %i cause",
    (upstreamStatus) => {
      it("should map to HTTP 502 Bad Gateway", () => {
        const exception = new AuthApiException(
          endpoint,
          context,
          new HttpException(faker.lorem.sentence(), upstreamStatus),
        )

        expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY)
      })

      it("should produce the minimal wire response shape with mapped 502", () => {
        const message = faker.lorem.sentence()
        const exception = new AuthApiException(
          endpoint,
          context,
          new HttpException(message, upstreamStatus),
        )

        expect(exception.getResponse()).toEqual({
          statusCode: HttpStatus.BAD_GATEWAY,
          message,
          error: "AuthApi",
        })
      })
    },
  )
})
