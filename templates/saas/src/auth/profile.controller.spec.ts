import { faker } from "@faker-js/faker"
import {
  type Account,
  type OAuthToken as AuthOAuthToken,
} from "@neomaventures/auth"
import { express } from "@neomaventures/fixtures"
import { type Repository } from "typeorm"

import { ProfileController } from "~auth/profile.controller"
import { type Upload } from "~auth/upload.entity"
import { type Profile } from "~profile/profile.entity"
import { type ProfileService } from "~profile/profile.service"

describe("ProfileController", () => {
  let controller: ProfileController
  let profileService: jest.Mocked<Pick<ProfileService, "setAvatar">>
  let profiles: jest.Mocked<Pick<Repository<Profile>, "findOne">>

  beforeEach(() => {
    profileService = { setAvatar: jest.fn() }
    profiles = { findOne: jest.fn() }
    controller = new ProfileController(
      profileService as unknown as ProfileService,
      profiles as unknown as Repository<Profile>,
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
            } as AuthOAuthToken,
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
            } as AuthOAuthToken,
          ],
        } as Account

        const result = controller.index(account)

        expect(result.connectedAccounts).toHaveLength(1)
        expect(result.connectedAccounts[0].active).toBe(false)
      })
    })
  })

  describe("avatar()", () => {
    describe("Given the principal has a profile with an avatar", () => {
      it("should return the avatar from the profile", async () => {
        const upload = { id: faker.string.uuid() } as Upload
        const account = {
          id: faker.string.uuid(),
          email: faker.internet.email(),
        } as Account
        profiles.findOne.mockResolvedValue({
          id: faker.string.uuid(),
          account,
          displayName: null,
          avatar: upload,
        } as Profile)

        await expect(controller.avatar(account)).resolves.toBe(upload)
      })
    })

    describe("Given the principal has no profile row", () => {
      it("should return null", async () => {
        const account = {
          id: faker.string.uuid(),
          email: faker.internet.email(),
        } as Account
        profiles.findOne.mockResolvedValue(null)

        await expect(controller.avatar(account)).resolves.toBeNull()
      })
    })

    describe("Given the principal has a profile with no avatar", () => {
      it("should return null", async () => {
        const account = {
          id: faker.string.uuid(),
          email: faker.internet.email(),
        } as Account
        profiles.findOne.mockResolvedValue({
          id: faker.string.uuid(),
          account,
          displayName: null,
          avatar: null,
        } as Profile)

        await expect(controller.avatar(account)).resolves.toBeNull()
      })
    })
  })

  describe("uploadAvatar()", () => {
    describe("Given an authenticated principal and a stored Upload", () => {
      it("should call profileService.setAvatar and redirect to /profile", async () => {
        const account = {
          id: faker.string.uuid(),
          email: faker.internet.email(),
        } as Account
        const upload = { id: faker.string.uuid() } as Upload
        const res = express.response() as unknown as Parameters<
          ProfileController["uploadAvatar"]
        >[2]

        await controller.uploadAvatar(account, upload, res)

        expect(profileService.setAvatar).toHaveBeenCalledWith(account, upload)
        expect(res.redirect).toHaveBeenCalledWith("/profile")
      })
    })
  })
})
