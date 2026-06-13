import { faker } from "@faker-js/faker"

import { ProfileController } from "~profile/profile.controller"
import { type ProfileService } from "~profile/profile.service"
import { type Upload } from "~profile/upload.entity"

describe("ProfileController", () => {
  let controller: ProfileController
  let profileService: jest.Mocked<Pick<ProfileService, "getAvatar">>

  beforeEach(() => {
    profileService = { getAvatar: jest.fn() }
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
})
