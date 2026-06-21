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

  it("should expose the endpoint property on the instance", () => {
    expect(exception.endpoint).toBe(endpoint)
  })

  it("should expose the context property on the instance", () => {
    expect(exception.context).toEqual({ labelId })
  })

  it("should chain the cause via Error.cause", () => {
    expect(exception.cause).toBe(cause)
  })

  it("should return HTTP 502 Bad Gateway", () => {
    expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY)
  })

  it("should produce the minimal wire response shape", () => {
    expect(exception.getResponse()).toEqual({
      statusCode: HttpStatus.BAD_GATEWAY,
      message: `Gmail network error: ${cause.message}`,
      error: "Bad Gateway",
    })
  })

  it("should have the correct message", () => {
    expect(exception.message).toBe(`Gmail network error: ${cause.message}`)
  })

  describe("code extraction", () => {
    describe.each([
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "EAI_AGAIN",
      "UND_ERR_SOCKET",
    ])("Given a cause whose nested cause carries %s", (code) => {
      it(`should expose code = "${code}"`, () => {
        const nested = Object.assign(new Error(faker.lorem.sentence()), {
          code,
        })
        const outer = new Error(faker.lorem.sentence(), { cause: nested })

        const ex = new GmailNetworkException(endpoint, { labelId }, outer)

        expect(ex.code).toBe(code)
      })
    })

    describe.each([
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "EAI_AGAIN",
      "UND_ERR_SOCKET",
    ])("Given a cause that directly carries %s", (code) => {
      it(`should expose code = "${code}"`, () => {
        const direct = Object.assign(new Error(faker.lorem.sentence()), {
          code,
        })

        const ex = new GmailNetworkException(endpoint, { labelId }, direct)

        expect(ex.code).toBe(code)
      })
    })

    describe("Given an AbortError cause", () => {
      it("should expose code = ETIMEDOUT", () => {
        const abort = new Error(faker.lorem.sentence())
        abort.name = "AbortError"

        const ex = new GmailNetworkException(endpoint, { labelId }, abort)

        expect(ex.code).toBe("ETIMEDOUT")
      })
    })

    describe("Given a cause with no recognisable code", () => {
      it("should expose code = UNKNOWN", () => {
        const plain = new Error(faker.lorem.sentence())

        const ex = new GmailNetworkException(endpoint, { labelId }, plain)

        expect(ex.code).toBe("UNKNOWN")
      })
    })

    describe("Given a cause with an unrecognised code value", () => {
      it("should expose code = UNKNOWN", () => {
        const weird = Object.assign(new Error(faker.lorem.sentence()), {
          code: "EWEIRD",
        })

        const ex = new GmailNetworkException(endpoint, { labelId }, weird)

        expect(ex.code).toBe("UNKNOWN")
      })
    })
  })
})
