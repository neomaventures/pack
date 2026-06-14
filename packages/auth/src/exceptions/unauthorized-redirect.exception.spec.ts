import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { UnauthorizedRedirectException } from "./unauthorized-redirect.exception"

const { UNAUTHORIZED, SEE_OTHER } = HttpStatus

describe("UnauthorizedRedirectException", () => {
  const url = faker.internet.url()

  describe("When constructed without a contextual message", () => {
    let exception: UnauthorizedRedirectException

    beforeEach(() => {
      exception = new UnauthorizedRedirectException(url, SEE_OTHER)
    })

    it("should have the url property", () => {
      expect(exception.url).toBe(url)
    })

    it("should have the redirectStatus property", () => {
      expect(exception.redirectStatus).toBe(SEE_OTHER)
    })

    it("should return 401 (Unauthorized)", () => {
      expect(exception.getStatus()).toBe(UNAUTHORIZED)
    })

    it("should return the redirect url and status", () => {
      expect(exception.getRedirect()).toEqual({ url, status: SEE_OTHER })
    })

    it("should include the default message and redirect target in the response body", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: UNAUTHORIZED,
        message: "Unauthorized. Redirecting to login.",
        redirect: { url, status: SEE_OTHER },
      })
    })
  })

  describe("When constructed with a contextual message", () => {
    const message = `Unauthenticated, access to resource ${faker.system.filePath()} denied`
    let exception: UnauthorizedRedirectException

    beforeEach(() => {
      exception = new UnauthorizedRedirectException(url, SEE_OTHER, message)
    })

    it("should append '. Redirecting to login.' to the message in the response body", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: UNAUTHORIZED,
        message: `${message}. Redirecting to login.`,
        redirect: { url, status: SEE_OTHER },
      })
    })

    it("should still expose the url and redirectStatus properties", () => {
      expect(exception.url).toBe(url)
      expect(exception.redirectStatus).toBe(SEE_OTHER)
    })
  })
})
