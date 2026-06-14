import { faker } from "@faker-js/faker"
import { type OAuthTokenSnapshot } from "@neomaventures/auth"
import { express } from "@neomaventures/fixtures"

import { type Account } from "~auth/account.entity"
import { type AccountService } from "~auth/account.service"
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
    describe("Given an authenticated principal", () => {
      it("should render the profile template", () => {
        expect(controller.index()).toEqual({})
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

  describe("googleToken()", () => {
    describe("Given the decorator resolved a snapshot", () => {
      it("should echo the snapshot under `token`", () => {
        const snapshot: OAuthTokenSnapshot = {
          accessToken: faker.string.alphanumeric(40),
          expiresAt: new Date(Date.now() + 3600 * 1000),
          scopes: ["openid", "email"],
        }

        expect(controller.googleToken(snapshot)).toEqual({ token: snapshot })
      })
    })

    describe("Given the decorator resolved null", () => {
      it("should return token: null", () => {
        expect(controller.googleToken(null)).toEqual({ token: null })
      })
    })
  })
})
