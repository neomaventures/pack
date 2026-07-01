import { faker } from "@faker-js/faker"
import { express } from "@neomaventures/fixtures"

import { ProfileController } from "~auth/profile.controller"
import { type ProfileService } from "~auth/profile.service"
import { type Upload } from "~auth/upload.entity"

describe("ProfileController", () => {
  let controller: ProfileController
  let profileService: jest.Mocked<
    Pick<ProfileService, "setAvatar" | "getAvatar">
  >

  beforeEach(() => {
    profileService = { setAvatar: jest.fn(), getAvatar: jest.fn() }
    controller = new ProfileController(
      profileService as unknown as ProfileService,
    )
  })

  describe("index()", () => {
    it("should return void — all view data flows through res.locals", () => {
      expect(controller.index()).toBeUndefined()
    })
  })

  describe("avatar()", () => {
    describe("Given profileService.getAvatar returns an Upload", () => {
      it("should return that Upload", async () => {
        const upload = { id: faker.string.uuid() } as Upload
        const account = { id: faker.string.uuid() } as Parameters<
          ProfileController["avatar"]
        >[0]
        profileService.getAvatar.mockResolvedValue(upload)

        await expect(controller.avatar(account)).resolves.toBe(upload)
        expect(profileService.getAvatar).toHaveBeenCalledWith(account)
      })
    })

    describe("Given profileService.getAvatar returns null", () => {
      it("should return null", async () => {
        const account = { id: faker.string.uuid() } as Parameters<
          ProfileController["avatar"]
        >[0]
        profileService.getAvatar.mockResolvedValue(null)

        await expect(controller.avatar(account)).resolves.toBeNull()
      })
    })
  })

  describe("uploadAvatar()", () => {
    describe("Given an authenticated account and a stored Upload", () => {
      it("should call profileService.setAvatar and redirect to /profile", async () => {
        const account = { id: faker.string.uuid() } as Parameters<
          ProfileController["uploadAvatar"]
        >[0]
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
