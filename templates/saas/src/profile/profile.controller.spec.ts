import { faker } from "@faker-js/faker"

import { type Account } from "~auth/account.entity"
import { ProfileController } from "~profile/profile.controller"
import { type ProfileService } from "~profile/profile.service"
import { type Upload } from "~profile/upload.entity"

describe("ProfileController", () => {
  let controller: ProfileController
  let profileService: jest.Mocked<Pick<ProfileService, "setAvatar">>

  beforeEach(() => {
    profileService = { setAvatar: jest.fn() }
    controller = new ProfileController(
      profileService as unknown as ProfileService,
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
        const redirect = jest.fn()
        const res = { redirect } as unknown as Parameters<
          ProfileController["uploadAvatar"]
        >[2]

        profileService.setAvatar.mockImplementation((a: Account, u: Upload) => {
          if (a === account && u === upload) {
            return Promise.resolve()
          }
          throw new Error("Unexpected setAvatar arguments")
        })

        await controller.uploadAvatar(account, upload, res)

        expect(redirect).toHaveBeenCalledWith("/profile")
      })
    })
  })
})
