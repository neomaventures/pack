import { faker } from "@faker-js/faker"
import { google } from "@neomaventures/google-fixtures"

import { fakeAccount, fakeOAuthToken } from "../testing"

describe("Account", () => {
  describe("activeToken()", () => {
    describe("Given the account has no oauthTokens field", () => {
      it("should return null", () => {
        expect(
          fakeAccount({ oauthTokens: undefined }).activeToken("google"),
        ).toBeNull()
      })
    })

    describe("Given the account has an empty oauthTokens array", () => {
      it("should return null", () => {
        expect(
          fakeAccount({ oauthTokens: [] }).activeToken("google"),
        ).toBeNull()
      })
    })

    describe("Given the account has no token for the requested provider", () => {
      it("should return null", () => {
        const account = fakeAccount({
          oauthTokens: [fakeOAuthToken({ provider: "github" })],
        })
        expect(account.activeToken("google")).toBeNull()
      })
    })

    describe("Given the account has an active token for the provider", () => {
      it("should return a snapshot with accessToken, expiresAt, and scopes", () => {
        const accessToken = google.accessToken()
        const expiresAt = new Date(Date.now() + 3600 * 1000)
        const scopes = ["openid", "email"]
        const stored = fakeOAuthToken({ accessToken, expiresAt, scopes })
        const account = fakeAccount({ oauthTokens: [stored] })

        expect(account.activeToken("google")).toEqual({
          accessToken,
          expiresAt,
          scopes,
        })
      })
    })

    describe("Given the account has an expired token for the provider", () => {
      it("should return null", () => {
        const expired = fakeOAuthToken({
          expiresAt: new Date(Date.now() - 60 * 1000),
        })
        expect(
          fakeAccount({ oauthTokens: [expired] }).activeToken("google"),
        ).toBeNull()
      })
    })

    describe("Given expiresAt arrives as an ISO string (defensive fixture)", () => {
      it("should treat it as a Date for the expiry check and the snapshot", () => {
        const accessToken = google.accessToken()
        const expiresAt = new Date(Date.now() + 3600 * 1000)
        const stored = fakeOAuthToken({ accessToken })
        stored.expiresAt = expiresAt.toISOString() as unknown as Date

        const snapshot = fakeAccount({ oauthTokens: [stored] }).activeToken(
          "google",
        )
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
          fakeOAuthToken({ provider: "github", accessToken: githubAccess }),
          fakeOAuthToken({ provider: "google", accessToken: googleAccess }),
        ]
        const account = fakeAccount({ oauthTokens: tokens })

        const snapshot = account.activeToken("google")
        expect(snapshot?.accessToken).toBe(googleAccess)
      })
    })
  })
})
