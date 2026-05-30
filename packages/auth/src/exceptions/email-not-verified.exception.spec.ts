import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { EmailNotVerifiedException } from "./email-not-verified.exception"

describe("EmailNotVerifiedException", () => {
  const email = faker.internet.email()
  let exception: EmailNotVerifiedException

  beforeEach(() => {
    exception = new EmailNotVerifiedException(email)
  })

  it("should have the email property", () => {
    expect(exception.email).toBe(email)
  })

  it("should return HTTP 403 Forbidden", () => {
    expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN)
  })

  it("should include email in the response body", () => {
    expect(exception.getResponse()).toMatchObject({
      statusCode: HttpStatus.FORBIDDEN,
      message: `The email address ${email} has not been verified.`,
      email,
      error: "Forbidden",
    })
  })

  it("should have the correct message", () => {
    expect(exception.message).toBe(
      `The email address ${email} has not been verified.`,
    )
  })
})
