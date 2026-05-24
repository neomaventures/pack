import { HttpStatus } from "@nestjs/common"

import { NoFileProvidedException } from "./no-file-provided.exception"

const { BAD_REQUEST } = HttpStatus

describe("NoFileProvidedException", () => {
  let exception: NoFileProvidedException

  beforeEach(() => {
    exception = new NoFileProvidedException()
  })

  it("should have a descriptive message", () => {
    expect(exception.message).toBe("No file was provided in the request.")
  })

  describe("getStatus()", () => {
    it("should return 400 (Bad Request)", () => {
      expect(exception.getStatus()).toBe(BAD_REQUEST)
    })
  })

  describe("getResponse()", () => {
    it("should include statusCode, message, and error", () => {
      expect(exception.getResponse()).toMatchObject({
        statusCode: BAD_REQUEST,
        message: "No file was provided in the request.",
        error: "Bad Request",
      })
    })
  })
})
