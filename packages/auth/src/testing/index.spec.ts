import { Account } from "../entities/account.entity"
import { OAuthToken } from "../entities/oauth-token.entity"

import { fakeAccount, fakeOAuthToken } from "./index"

describe("@neomaventures/auth/testing", () => {
  describe("fakeAccount()", () => {
    describe("Given no overrides", () => {
      it("should return a real Account instance", () => {
        expect(fakeAccount()).toBeInstanceOf(Account)
      })

      it("should populate id, email, permissions, oauthTokens, timestamps", () => {
        const account = fakeAccount()

        expect(account.id).toBeTruthy()
        expect(account.email).toMatch(/@/)
        expect(account.email).toBe(account.email.toLowerCase())
        expect(account.permissions).toEqual([])
        expect(account.oauthTokens).toEqual([])
        expect(account.createdAt).toBeInstanceOf(Date)
        expect(account.updatedAt).toBeInstanceOf(Date)
      })

      it("should expose activeToken() because it is a real Account", () => {
        expect(typeof fakeAccount().activeToken).toBe("function")
        expect(fakeAccount().activeToken("google")).toBeNull()
      })
    })

    describe("Given overrides", () => {
      it("should apply them on top of defaults", () => {
        const account = fakeAccount({
          email: "fixed@example.com",
          permissions: ["read:users"],
        })

        expect(account.email).toBe("fixed@example.com")
        expect(account.permissions).toEqual(["read:users"])
      })
    })

    describe("Given a fake OAuth token via overrides", () => {
      it("should make activeToken() resolve via the seeded token", () => {
        const account = fakeAccount({ oauthTokens: [fakeOAuthToken()] })
        const snapshot = account.activeToken("google")
        expect(snapshot).not.toBeNull()
        expect(snapshot?.scopes).toEqual(["openid", "email", "profile"])
      })
    })
  })

  describe("fakeOAuthToken()", () => {
    describe("Given no overrides", () => {
      it("should return a real OAuthToken instance", () => {
        expect(fakeOAuthToken()).toBeInstanceOf(OAuthToken)
      })

      it("should default to provider google with a non-expired token", () => {
        const token = fakeOAuthToken()

        expect(token.provider).toBe("google")
        expect(token.accessToken).toBeTruthy()
        expect(token.refreshToken).toBeNull()
        expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now())
        expect(token.scopes).toEqual(["openid", "email", "profile"])
      })
    })

    describe("Given overrides", () => {
      it("should apply them on top of defaults", () => {
        const past = new Date(Date.now() - 1000)
        const token = fakeOAuthToken({
          provider: "github",
          expiresAt: past,
        })

        expect(token.provider).toBe("github")
        expect(token.expiresAt).toBe(past)
      })
    })
  })
})
