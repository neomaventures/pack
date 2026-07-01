import { faker } from "@faker-js/faker"
import { entities, setAccount } from "@neomaventures/auth/testing"
import { google } from "@neomaventures/google-fixtures"
import { GMAIL_READONLY_SCOPE } from "@neomaventures/mailbox"
import { RequestContextModule } from "@neomaventures/request-context"
import { Test, type TestingModule } from "@nestjs/testing"
import { ClsService } from "nestjs-cls"

import { GmailNotConnectedException } from "~auth/gmail-not-connected.exception"
import { GmailTokenAccessor } from "~auth/gmail-token-accessor"

describe("GmailTokenAccessor", () => {
  let accessor: GmailTokenAccessor
  let cls: ClsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [RequestContextModule.forRoot()],
      providers: [GmailTokenAccessor],
    }).compile()

    accessor = module.get(GmailTokenAccessor)
    cls = module.get(ClsService)
  })

  describe("getToken()", () => {
    describe("Given the requested scope is not gmail.readonly", () => {
      it("should throw with a clear unsupported-scope error", async () => {
        const scope = faker.internet.url()

        await expect(accessor.getToken(scope)).rejects.toMatchError(Error, {
          message: `Unsupported scope: ${scope}`,
        })
      })
    })

    describe("Given no account is on the current request", () => {
      it("should throw 'No authenticated account on the current request'", async () => {
        await cls.run(async () => {
          await expect(
            accessor.getToken(GMAIL_READONLY_SCOPE),
          ).rejects.toMatchError(Error, {
            message: "No authenticated account on the current request",
          })
        })
      })
    })

    describe("Given the account has no google OAuthToken", () => {
      it("should throw GmailNotConnectedException", async () => {
        const account = entities.account({ oauthTokens: [] })

        await cls.run(async () => {
          setAccount(account)
          await expect(
            accessor.getToken(GMAIL_READONLY_SCOPE),
          ).rejects.toMatchError(GmailNotConnectedException, {
            message: "Gmail is not connected.",
          })
        })
      })
    })

    describe("Given the account's google token has expired", () => {
      it("should throw GmailNotConnectedException", async () => {
        const account = entities.account({
          oauthTokens: [
            entities.oauthToken({
              provider: "google",
              expiresAt: new Date(Date.now() - 60 * 1000),
              scopes: [...google.sensibleScopes(), GMAIL_READONLY_SCOPE],
            }),
          ],
        })

        await cls.run(async () => {
          setAccount(account)
          await expect(
            accessor.getToken(GMAIL_READONLY_SCOPE),
          ).rejects.toMatchError(GmailNotConnectedException, {
            message: "Gmail is not connected.",
          })
        })
      })
    })

    describe("Given the account has a google token without the gmail.readonly scope", () => {
      it("should throw GmailNotConnectedException", async () => {
        const account = entities.account({
          oauthTokens: [
            entities.oauthToken({
              provider: "google",
              scopes: google.sensibleScopes(),
            }),
          ],
        })

        await cls.run(async () => {
          setAccount(account)
          await expect(
            accessor.getToken(GMAIL_READONLY_SCOPE),
          ).rejects.toMatchError(GmailNotConnectedException, {
            message: "Gmail is not connected.",
          })
        })
      })
    })

    describe("Given the account has an active google token with the gmail.readonly scope", () => {
      it("should resolve the account from the request slot and return that token's accessToken", async () => {
        const accessToken = google.accessToken()
        const account = entities.account({
          oauthTokens: [
            entities.oauthToken({
              provider: "google",
              accessToken,
              expiresAt: new Date(Date.now() + 3600 * 1000),
              scopes: [...google.sensibleScopes(), GMAIL_READONLY_SCOPE],
            }),
          ],
        })

        await cls.run(async () => {
          setAccount(account)
          await expect(accessor.getToken(GMAIL_READONLY_SCOPE)).resolves.toBe(
            accessToken,
          )
        })
      })
    })
  })
})
