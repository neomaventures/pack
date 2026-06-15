import { faker } from "@faker-js/faker"
import { express } from "@neomaventures/fixtures"

import { type Account } from "~auth/account.entity"
import { type AccountService } from "~auth/account.service"
import { type OAuthToken } from "~auth/oauth-token.entity"
import { ProfileController } from "~auth/profile.controller"
import { type Upload } from "~auth/upload.entity"

describe("ProfileController", () => {
  let controller: ProfileController
  let accountService: jest.Mocked<Pick<AccountService, "setAvatar">>

  beforeEach(() => {
    accountService = { setAvatar: jest.fn() }
    controller = new ProfileController(
      accountService as unknown as AccountService,
    )
  })

  describe("index()", () => {
    describe("Given an authenticated principal with no oauthTokens", () => {
      it("should return an empty connectedAccounts list", () => {
        const account = {
          id: faker.string.uuid(),
          email: faker.internet.email(),
        } as Account

        expect(controller.index(account)).toEqual({ connectedAccounts: [] })
      })
    })

    describe("Given an authenticated principal with an active Google token", () => {
      it("should return a connectedAccounts entry with active: true and no access/refresh tokens", () => {
        const expiresAt = new Date(Date.now() + 3600 * 1000)
        const scopes = ["openid", "email", "profile"]
        const account = {
          id: faker.string.uuid(),
          email: faker.internet.email(),
          oauthTokens: [
            {
              provider: "google",
              accessToken: faker.string.alphanumeric(40),
              refreshToken: faker.string.alphanumeric(40),
              expiresAt,
              scopes,
            } as OAuthToken,
          ],
        } as Account

        const result = controller.index(account)

        expect(result.connectedAccounts).toEqual([
          { provider: "google", scopes, expiresAt, active: true },
        ])
        expect(result.connectedAccounts[0]).not.toHaveProperty("accessToken")
        expect(result.connectedAccounts[0]).not.toHaveProperty("refreshToken")
      })
    })

    describe("Given an authenticated principal with an expired Google token", () => {
      it("should return a connectedAccounts entry with active: false", () => {
        const expiresAt = new Date(Date.now() - 60 * 1000)
        const account = {
          id: faker.string.uuid(),
          email: faker.internet.email(),
          oauthTokens: [
            {
              provider: "google",
              accessToken: faker.string.alphanumeric(40),
              refreshToken: null,
              expiresAt,
              scopes: ["openid", "email"],
            } as OAuthToken,
          ],
        } as Account

        const result = controller.index(account)

        expect(result.connectedAccounts).toHaveLength(1)
        expect(result.connectedAccounts[0].active).toBe(false)
      })
    })
  })

  describe("avatar()", () => {
    describe("Given the principal has an avatar", () => {
      it("should return the avatar for the principal", () => {
        const upload = { id: faker.string.uuid() } as Upload
        const account = {
          id: faker.string.uuid(),
          email: faker.internet.email(),
          avatar: upload,
        } as Account

        expect(controller.avatar(account)).toBe(upload)
      })
    })

    describe("Given the principal has no avatar", () => {
      it("should return null", () => {
        const account = {
          id: faker.string.uuid(),
          email: faker.internet.email(),
          avatar: null,
        } as Account

        expect(controller.avatar(account)).toBeNull()
      })
    })
  })

  describe("uploadAvatar()", () => {
    describe("Given an authenticated principal and a stored Upload", () => {
      it("should set the avatar on the principal's account and redirect to /profile", async () => {
        const account = {
          id: faker.string.uuid(),
          email: faker.internet.email(),
        } as Account
        const upload = { id: faker.string.uuid() } as Upload
        const res = express.response() as unknown as Parameters<
          ProfileController["uploadAvatar"]
        >[2]

        await controller.uploadAvatar(account, upload, res)

        expect(accountService.setAvatar).toHaveBeenCalledWith(account, upload)
        expect(res.redirect).toHaveBeenCalledWith("/profile")
      })
    })
  })
})
