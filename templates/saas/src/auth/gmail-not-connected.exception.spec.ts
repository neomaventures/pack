import { HttpStatus } from "@nestjs/common"

import { GmailNotConnectedException } from "~auth/gmail-not-connected.exception"

describe("GmailNotConnectedException", () => {
  let exception: GmailNotConnectedException

  beforeEach(() => {
    exception = new GmailNotConnectedException()
  })

  describe("Given a fresh instance", () => {
    it("should return HTTP 200 OK", () => {
      expect(exception.getStatus()).toBe(HttpStatus.OK)
    })

    it("should include the error discriminator 'GmailNotConnected'", () => {
      expect(exception.getResponse()).toMatchObject({
        error: "GmailNotConnected",
      })
    })

    it("should include a user-facing message", () => {
      expect(exception.getResponse()).toMatchObject({
        message: "Gmail is not connected.",
      })
    })

    it("should return a minimal wire response { statusCode, message, error }", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: HttpStatus.OK,
        message: "Gmail is not connected.",
        error: "GmailNotConnected",
      })
    })
  })
})
