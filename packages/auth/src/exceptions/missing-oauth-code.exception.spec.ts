import { BadRequestException, HttpStatus } from "@nestjs/common"

import { MissingOAuthCodeException } from "./missing-oauth-code.exception"

describe("MissingOAuthCodeException", () => {
  describe("Given the default message", () => {
    let exception: MissingOAuthCodeException

    beforeEach(() => {
      exception = new MissingOAuthCodeException()
    })

    it("should be an instance of BadRequestException", () => {
      expect(exception).toBeInstanceOf(BadRequestException)
    })

    it("should be an instance of MissingOAuthCodeException", () => {
      expect(exception).toBeInstanceOf(MissingOAuthCodeException)
    })

    it("should return HTTP 400 Bad Request", () => {
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST)
    })

    it('should set this.name to "MissingOAuthCodeException"', () => {
      expect(exception.name).toBe("MissingOAuthCodeException")
    })

    it("should use the default message", () => {
      expect(exception.message).toBe(
        "Missing code query parameter on OAuth callback",
      )
    })
  })

  describe("Given a custom message", () => {
    it("should expose the custom message", () => {
      const exception = new MissingOAuthCodeException("custom message")

      expect(exception.message).toBe("custom message")
    })
  })
})
