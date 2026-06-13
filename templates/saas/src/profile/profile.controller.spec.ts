import { faker } from "@faker-js/faker"

import { type Account } from "~auth/account.entity"
import { ProfileController } from "~profile/profile.controller"
import { type ProfileService } from "~profile/profile.service"
import { type Upload } from "~profile/upload.entity"

describe("ProfileController", () => {
  let controller: ProfileController
  let profileService: jest.Mocked<
    Pick<ProfileService, "getAvatar" | "setAvatar" | "findAccount">
  >

  beforeEach(() => {
    profileService = {
      getAvatar: jest.fn(),
      setAvatar: jest.fn(),
      findAccount: jest.fn(),
    }
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
    describe("Given an authenticated principal", () => {
      it("should resolve the avatar for the principal via the service", async () => {
        const principal = {
          id: faker.string.uuid(),
          email: faker.internet.email(),
          permissions: [],
        }
        const upload = { id: faker.string.uuid() } as Upload

        profileService.getAvatar.mockImplementation((accountId: string) => {
          if (accountId === principal.id) {
            return Promise.resolve(upload)
          }
          throw new Error(`Unexpected accountId: ${accountId}`)
        })

        await expect(controller.avatar(principal)).resolves.toBe(upload)
      })
    })
  })

  describe("uploadAvatar()", () => {
    describe("Given an authenticated principal and a stored Upload", () => {
      it("should set the avatar on the principal's account and redirect to /profile", async () => {
        const principal = {
          id: faker.string.uuid(),
          email: faker.internet.email(),
          permissions: [],
        }
        const account = { id: principal.id, email: principal.email } as Account
        const upload = { id: faker.string.uuid() } as Upload
        const redirect = jest.fn()
        const res = { redirect } as unknown as Parameters<
          ProfileController["uploadAvatar"]
        >[2]

        profileService.findAccount.mockImplementation((accountId: string) => {
          if (accountId === principal.id) {
            return Promise.resolve(account)
          }
          throw new Error(`Unexpected accountId: ${accountId}`)
        })
        profileService.setAvatar.mockImplementation((a: Account, u: Upload) => {
          if (a === account && u === upload) {
            return Promise.resolve()
          }
          throw new Error("Unexpected setAvatar arguments")
        })

        await controller.uploadAvatar(principal, upload, res)

        expect(redirect).toHaveBeenCalledWith("/profile")
      })
    })

    describe("Given the principal's account row cannot be found", () => {
      it("should throw NotFoundException", async () => {
        const principal = {
          id: faker.string.uuid(),
          email: faker.internet.email(),
          permissions: [],
        }
        const upload = { id: faker.string.uuid() } as Upload
        const res = { redirect: jest.fn() } as unknown as Parameters<
          ProfileController["uploadAvatar"]
        >[2]

        profileService.findAccount.mockResolvedValue(null)

        await expect(
          controller.uploadAvatar(principal, upload, res),
        ).rejects.toThrow(/Not Found/i)
      })
    })
  })
})
