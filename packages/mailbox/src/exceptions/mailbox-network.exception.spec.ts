import { faker } from "@faker-js/faker"
import { HttpStatus } from "@nestjs/common"

import { MailboxNetworkException } from "./mailbox-network.exception"

describe("MailboxNetworkException", () => {
  const endpoint = "/gmail/v1/users/me/labels/{labelId}"
  const context = { labelId: faker.string.alphanumeric(10) }

  describe("Given any cause", () => {
    const cause = new Error(faker.lorem.sentence())
    let exception: MailboxNetworkException

    beforeEach(() => {
      exception = new MailboxNetworkException(endpoint, context, cause)
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

    it("should return HTTP 502 Bad Gateway", () => {
      expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY)
    })

    it("should produce an opaque wire response that does not leak cause details", () => {
      expect(exception.getResponse()).toEqual({
        statusCode: HttpStatus.BAD_GATEWAY,
        message: "Bad Gateway",
        error: "MailboxNetwork",
      })
    })
  })

  describe("name", () => {
    it('should set this.name to "MailboxNetworkException"', () => {
      const exception = new MailboxNetworkException(
        endpoint,
        context,
        new Error(faker.lorem.sentence()),
      )

      expect(exception.name).toBe("MailboxNetworkException")
    })
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

        const ex = new MailboxNetworkException(endpoint, context, outer)

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

        const ex = new MailboxNetworkException(endpoint, context, direct)

        expect(ex.code).toBe(code)
      })
    })

    describe("Given an AbortError cause", () => {
      it("should expose code = ETIMEDOUT", () => {
        const abort = new Error(faker.lorem.sentence())
        abort.name = "AbortError"

        const ex = new MailboxNetworkException(endpoint, context, abort)

        expect(ex.code).toBe("ETIMEDOUT")
      })
    })

    describe("Given a cause with no recognisable code", () => {
      it("should expose code = UNKNOWN", () => {
        const plain = new Error(faker.lorem.sentence())

        const ex = new MailboxNetworkException(endpoint, context, plain)

        expect(ex.code).toBe("UNKNOWN")
      })
    })

    describe("Given a cause with an unrecognised code value", () => {
      it("should expose code = UNKNOWN", () => {
        const weird = Object.assign(new Error(faker.lorem.sentence()), {
          code: "EWEIRD",
        })

        const ex = new MailboxNetworkException(endpoint, context, weird)

        expect(ex.code).toBe("UNKNOWN")
      })
    })
  })
})
