import { faker } from "@faker-js/faker"

import { Account } from "./account.entity"
import { OAuthToken } from "./oauth-token.entity"

const buildToken = (overrides: Partial<OAuthToken> = {}): OAuthToken => {
  const token = new OAuthToken()
  token.id = faker.string.uuid()
  token.provider = "google"
  token.accessToken = faker.string.alphanumeric(40)
  token.refreshToken = faker.string.alphanumeric(40)
  token.expiresAt = new Date(Date.now() + 3600 * 1000)
  token.scopes = ["openid", "email", "profile"]
  Object.assign(token, overrides)
  return token
}

const buildAccount = (tokens?: OAuthToken[]): Account => {
  const account = new Account()
  account.id = faker.string.uuid()
  account.email = faker.internet.email().toLowerCase()
  account.permissions = []
  account.oauthTokens = tokens
  return account
}

describe("Account", () => {
  describe("activeToken()", () => {
    describe("Given the account has no oauthTokens field", () => {
      it("should return null", () => {
        expect(buildAccount(undefined).activeToken("google")).toBeNull()
      })
    })

    describe("Given the account has an empty oauthTokens array", () => {
      it("should return null", () => {
        expect(buildAccount([]).activeToken("google")).toBeNull()
      })
    })

    describe("Given the account has no token for the requested provider", () => {
      it("should return null", () => {
        const account = buildAccount([buildToken({ provider: "github" })])
        expect(account.activeToken("google")).toBeNull()
      })
    })

    describe("Given the account has an active token for the provider", () => {
      it("should return a snapshot with accessToken, expiresAt, and scopes", () => {
        const accessToken = faker.string.alphanumeric(40)
        const expiresAt = new Date(Date.now() + 3600 * 1000)
        const scopes = ["openid", "email"]
        const stored = buildToken({ accessToken, expiresAt, scopes })
        const account = buildAccount([stored])

        expect(account.activeToken("google")).toEqual({
          accessToken,
          expiresAt,
          scopes,
        })
      })
    })

    describe("Given the account has an expired token for the provider", () => {
      it("should return null", () => {
        const expired = buildToken({
          expiresAt: new Date(Date.now() - 60 * 1000),
        })
        expect(buildAccount([expired]).activeToken("google")).toBeNull()
      })
    })

    describe("Given expiresAt arrives as an ISO string (defensive fixture)", () => {
      it("should treat it as a Date for the expiry check and the snapshot", () => {
        const accessToken = faker.string.alphanumeric(40)
        const expiresAt = new Date(Date.now() + 3600 * 1000)
        const stored = buildToken({ accessToken })
        stored.expiresAt = expiresAt.toISOString() as unknown as Date

        const snapshot = buildAccount([stored]).activeToken("google")
        expect(snapshot).toEqual({
          accessToken,
          expiresAt,
          scopes: stored.scopes,
        })
      })
    })

    describe("Given the account has tokens for multiple providers", () => {
      it("should return the snapshot for the requested provider only", () => {
        const googleAccess = faker.string.alphanumeric(40)
        const githubAccess = faker.string.alphanumeric(40)
        const tokens = [
          buildToken({ provider: "github", accessToken: githubAccess }),
          buildToken({ provider: "google", accessToken: googleAccess }),
        ]
        const account = buildAccount(tokens)

        const snapshot = account.activeToken("google")
        expect(snapshot?.accessToken).toBe(googleAccess)
      })
    })
  })
})
