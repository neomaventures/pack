import { HttpStatus, InternalServerErrorException } from "@nestjs/common"

import { WebhookRawBodyException } from "./webhook-raw-body.exception"

const { INTERNAL_SERVER_ERROR } = HttpStatus

describe("WebhookRawBodyException", () => {
  let exception: WebhookRawBodyException

  beforeEach(() => {
    exception = new WebhookRawBodyException()
  })

  it("should be an instance of InternalServerErrorException", () => {
    expect(exception).toBeInstanceOf(InternalServerErrorException)
  })

  it("should have a descriptive message", () => {
    expect(exception.message).toBe(
      "rawBody is not available. Enable rawBody: true in NestFactory.create() options.",
    )
  })

  describe("getStatus()", () => {
    it("should return 500 (Internal Server Error)", () => {
      expect(exception.getStatus()).toBe(INTERNAL_SERVER_ERROR)
    })
  })

  describe("getResponse()", () => {
    it("should include statusCode, message, and error", () => {
      expect(exception.getResponse()).toMatchObject({
        statusCode: INTERNAL_SERVER_ERROR,
        message:
          "rawBody is not available. Enable rawBody: true in NestFactory.create() options.",
        error: "Internal Server Error",
      })
    })
  })
})
