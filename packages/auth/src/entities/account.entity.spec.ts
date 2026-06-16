import { faker } from "@faker-js/faker"
import { google } from "@neomaventures/google-fixtures"

import { entities } from "../testing"

describe("Account", () => {
  describe("activeToken()", () => {
    describe("Given the account has no oauthTokens field", () => {
      it("should return null", () => {
        expect(
          entities.account({ oauthTokens: undefined }).activeToken("google"),
        ).toBeNull()
      })
    })

    describe("Given the account has an empty oauthTokens array", () => {
      it("should return null", () => {
        expect(
          entities.account({ oauthTokens: [] }).activeToken("google"),
        ).toBeNull()
      })
    })

    describe("Given the account has no token for the requested provider", () => {
      it("should return null", () => {
        const account = entities.account({
          oauthTokens: [entities.oauthToken({ provider: "github" })],
        })
        expect(account.activeToken("google")).toBeNull()
      })
    })

    describe("Given the account has an active token for the provider", () => {
      it("should return a snapshot with accessToken, expiresAt, and scopes", () => {
        const accessToken = google.accessToken()
        const expiresAt = new Date(Date.now() + 3600 * 1000)
        const scopes = ["openid", "email"]
        const stored = entities.oauthToken({ accessToken, expiresAt, scopes })
        const account = entities.account({ oauthTokens: [stored] })

        expect(account.activeToken("google")).toEqual({
          accessToken,
          expiresAt,
          scopes,
        })
      })
    })

    describe("Given the account has an expired token for the provider", () => {
      it("should return null", () => {
        const expired = entities.oauthToken({
          expiresAt: new Date(Date.now() - 60 * 1000),
        })
        expect(
          entities.account({ oauthTokens: [expired] }).activeToken("google"),
        ).toBeNull()
      })
    })

    describe("Given expiresAt arrives as an ISO string (defensive fixture)", () => {
      it("should treat it as a Date for the expiry check and the snapshot", () => {
        const accessToken = google.accessToken()
        const expiresAt = new Date(Date.now() + 3600 * 1000)
        const stored = entities.oauthToken({ accessToken })
        stored.expiresAt = expiresAt.toISOString() as unknown as Date

        const snapshot = entities
          .account({ oauthTokens: [stored] })
          .activeToken("google")
        expect(snapshot).toEqual({
          accessToken,
          expiresAt,
          scopes: stored.scopes,
        })
      })
    })

    describe("Given the account has tokens for multiple providers", () => {
      it("should return the snapshot for the requested provider only", () => {
        const googleAccess = google.accessToken()
        const githubAccess = faker.string.alphanumeric(40)
        const tokens = [
          entities.oauthToken({
            provider: "github",
            accessToken: githubAccess,
          }),
          entities.oauthToken({
            provider: "google",
            accessToken: googleAccess,
          }),
        ]
        const account = entities.account({ oauthTokens: tokens })

        const snapshot = account.activeToken("google")
        expect(snapshot?.accessToken).toBe(googleAccess)
      })
    })
  })
})
