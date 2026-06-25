import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { AuthApiException } from "./auth-api.exception"

describe("AuthApiException", () => {
  const endpoint = "/oauth/token"

  describe("Given an upstream 401", () => {
    const provider = "google"
    const message = faker.lorem.sentence()
    const responseBody = { error: "invalid_grant" }
    let exception: AuthApiException

    beforeEach(() => {
      exception = new AuthApiException(
        401,
        endpoint,
        message,
        { provider, phase: "codeExchange" },
        responseBody,
      )
    })

    it("should expose the endpoint property on the instance", () => {
      expect(exception.endpoint).toBe(endpoint)
    })

    it("should expose the context property on the instance", () => {
      expect(exception.context).toEqual({ provider, phase: "codeExchange" })
    })

    it("should expose the responseBody property on the instance", () => {
      expect(exception.responseBody).toEqual(responseBody)
    })

    it("should expose the statusCode property on the instance", () => {
      expect(exception.statusCode).toBe(HttpStatus.UNAUTHORIZED)
    })

    it("should return HTTP 401 Unauthorized", () => {
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED)
    })

    it("should produce the minimal wire response shape", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: HttpStatus.UNAUTHORIZED,
        message,
        error: "AuthApi",
      })
    })
  })

  describe("Given an upstream 404", () => {
    const message = faker.lorem.sentence()
    const responseBody = { error: "not_found" }
    let exception: AuthApiException

    beforeEach(() => {
      exception = new AuthApiException(
        404,
        endpoint,
        message,
        { provider: "google", phase: "codeExchange" },
        responseBody,
      )
    })

    it("should return HTTP 404 Not Found", () => {
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

  describe("Given a cause", () => {
    it("should chain the cause via Error.cause", () => {
      const cause = new Error(faker.lorem.sentence())

      const exception = new AuthApiException(
        500,
        endpoint,
        faker.lorem.sentence(),
        { provider: "google", phase: "codeExchange" },
        null,
        cause,
      )

      expect(exception.cause).toBe(cause)
    })
  })

  describe("name", () => {
    it('should set this.name to "AuthApiException"', () => {
      const exception = new AuthApiException(
        500,
        endpoint,
        faker.lorem.sentence(),
        { provider: "google", phase: "codeExchange" },
        null,
      )

      expect(exception.name).toBe("AuthApiException")
    })
  })

  describe.each([500, 502, 503, 429, 418, 200])(
    "Given an upstream %i",
    (upstreamStatus) => {
      it("should map to HTTP 502 Bad Gateway", () => {
        const exception = new AuthApiException(
          upstreamStatus,
          endpoint,
          faker.lorem.sentence(),
          { provider: "google", phase: "codeExchange" },
          null,
        )

        expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY)
      })
    },
  )
})
