import { Account } from "../entities/account.entity"
import { OAuthToken } from "../entities/oauth-token.entity"

import { entities } from "./index"

describe("@neomaventures/auth/testing", () => {
  describe("entities", () => {
    describe("account()", () => {
      describe("Given no overrides", () => {
        it("should return a real Account instance", () => {
          expect(entities.account()).toBeInstanceOf(Account)
        })

        it("should populate id, email, permissions, oauthTokens, timestamps", () => {
          const account = entities.account()

          expect(account.id).toBeTruthy()
          expect(account.email).toMatch(/@/)
          expect(account.email).toBe(account.email.toLowerCase())
          expect(account.permissions).toEqual([])
          expect(account.oauthTokens).toEqual([])
          expect(account.createdAt).toBeInstanceOf(Date)
          expect(account.updatedAt).toBeInstanceOf(Date)
        })

        it("should expose activeToken() because it is a real Account", () => {
          expect(typeof entities.account().activeToken).toBe("function")
          expect(entities.account().activeToken("google")).toBeNull()
        })
      })

      describe("Given overrides", () => {
        it("should apply them on top of defaults", () => {
          const account = entities.account({
            email: "fixed@example.com",
            permissions: ["read:users"],
          })

          expect(account.email).toBe("fixed@example.com")
          expect(account.permissions).toEqual(["read:users"])
        })
      })

      describe("Given a fake OAuth token via overrides", () => {
        it("should make activeToken() resolve via the seeded token", () => {
          const account = entities.account({
            oauthTokens: [entities.oauthToken()],
          })
          const snapshot = account.activeToken("google")
          expect(snapshot).not.toBeNull()
          expect(snapshot?.scopes).toEqual(["openid", "email", "profile"])
        })
      })
    })

    describe("oauthToken()", () => {
      describe("Given no overrides", () => {
        it("should return a real OAuthToken instance", () => {
          expect(entities.oauthToken()).toBeInstanceOf(OAuthToken)
        })

        it("should default to provider google with a non-expired token", () => {
          const token = entities.oauthToken()

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
          const token = entities.oauthToken({
            provider: "github",
            expiresAt: past,
          })

          expect(token.provider).toBe("github")
          expect(token.expiresAt).toBe(past)
        })
      })
    })
  })
})
