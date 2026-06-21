import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { GmailNetworkException } from "./gmail-network.exception"

describe("GmailNetworkException", () => {
  const endpoint = "/gmail/v1/users/me/labels/{labelId}"
  const labelId = faker.string.alphanumeric(10)
  const cause = new Error(faker.lorem.sentence())
  let exception: GmailNetworkException

  beforeEach(() => {
    exception = new GmailNetworkException(endpoint, { labelId }, cause)
  })

  it("should expose the endpoint property", () => {
    expect(exception.endpoint).toBe(endpoint)
  })

  it("should expose the context property", () => {
    expect(exception.context).toEqual({ labelId })
  })

  it("should chain the cause via Error.cause", () => {
    expect(exception.cause).toBe(cause)
  })

  it("should return HTTP 503 Service Unavailable", () => {
    expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE)
  })

  it("should include endpoint and context in the response body", () => {
    expect(exception.getResponse()).toMatchObject({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: `Gmail network error: ${cause.message}`,
      endpoint,
      context: { labelId },
      error: "GmailNetwork",
    })
  })

  it("should have the correct message", () => {
    expect(exception.message).toBe(`Gmail network error: ${cause.message}`)
  })
})
