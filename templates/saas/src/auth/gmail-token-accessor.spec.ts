import { faker } from "@faker-js/faker"
import { entities } from "@neomaventures/auth/testing"
import { GMAIL_READONLY_SCOPE } from "@neomaventures/mailbox"
import { Test, type TestingModule } from "@nestjs/testing"

import { GmailNotConnectedException } from "~auth/gmail-not-connected.exception"
import { GmailTokenAccessor } from "~auth/gmail-token-accessor"

jest.mock("@neomaventures/request-context", () => ({
  ...jest.requireActual("@neomaventures/request-context"),
  getRequest: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getRequest } = require("@neomaventures/request-context") as {
  getRequest: jest.Mock
}

describe("GmailTokenAccessor", () => {
  let accessor: GmailTokenAccessor

  beforeEach(async () => {
    getRequest.mockReset()

    const module: TestingModule = await Test.createTestingModule({
      providers: [GmailTokenAccessor],
    }).compile()

    accessor = module.get<GmailTokenAccessor>(GmailTokenAccessor)
  })

  describe("getToken()", () => {
    describe("Given the requested scope is not gmail.readonly", () => {
      it("should throw with a clear unsupported-scope error", async () => {
        const scope = faker.internet.url()

        await expect(accessor.getToken(scope)).rejects.toThrow(
          `Unsupported scope: ${scope}`,
        )
      })
    })

    describe("Given no request is in scope", () => {
      it("should throw 'No authenticated account on the current request'", async () => {
        getRequest.mockReturnValue(undefined)

        await expect(accessor.getToken(GMAIL_READONLY_SCOPE)).rejects.toThrow(
          "No authenticated account on the current request",
        )
      })
    })

    describe("Given a request with no authenticated account", () => {
      it("should throw 'No authenticated account on the current request'", async () => {
        getRequest.mockReturnValue({})

        await expect(accessor.getToken(GMAIL_READONLY_SCOPE)).rejects.toThrow(
          "No authenticated account on the current request",
        )
      })
    })

    describe("Given the account has no google OAuthToken", () => {
      it("should throw GmailNotConnectedException", async () => {
        const account = entities.account({ oauthTokens: [] })
        getRequest.mockReturnValue({ account })

        await expect(accessor.getToken(GMAIL_READONLY_SCOPE)).rejects.toThrow(
          GmailNotConnectedException,
        )
      })
    })

    describe("Given the account's google token has expired", () => {
      it("should throw GmailNotConnectedException", async () => {
        const account = entities.account({
          oauthTokens: [
            entities.oauthToken({
              provider: "google",
              expiresAt: new Date(Date.now() - 60 * 1000),
              scopes: ["openid", "email", "profile", GMAIL_READONLY_SCOPE],
            }),
          ],
        })
        getRequest.mockReturnValue({ account })

        await expect(accessor.getToken(GMAIL_READONLY_SCOPE)).rejects.toThrow(
          GmailNotConnectedException,
        )
      })
    })

    describe("Given the account has a google token without the gmail.readonly scope", () => {
      it("should throw GmailNotConnectedException", async () => {
        const account = entities.account({
          oauthTokens: [
            entities.oauthToken({
              provider: "google",
              scopes: ["openid", "email", "profile"],
            }),
          ],
        })
        getRequest.mockReturnValue({ account })

        await expect(accessor.getToken(GMAIL_READONLY_SCOPE)).rejects.toThrow(
          GmailNotConnectedException,
        )
      })
    })

    describe("Given the account has an active google token with the gmail.readonly scope", () => {
      it("should return that token's accessToken", async () => {
        const accessToken = faker.string.alphanumeric(40)
        const account = entities.account({
          oauthTokens: [
            entities.oauthToken({
              provider: "google",
              accessToken,
              expiresAt: new Date(Date.now() + 3600 * 1000),
              scopes: ["openid", "email", "profile", GMAIL_READONLY_SCOPE],
            }),
          ],
        })
        getRequest.mockReturnValue({ account })

        await expect(accessor.getToken(GMAIL_READONLY_SCOPE)).resolves.toBe(
          accessToken,
        )
      })
    })
  })
})
