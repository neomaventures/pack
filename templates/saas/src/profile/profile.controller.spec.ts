import { Test, type TestingModule } from "@nestjs/testing"

import { ProfileController } from "~profile/profile.controller"

describe("ProfileController", () => {
  let controller: ProfileController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
    }).compile()

    controller = module.get<ProfileController>(ProfileController)
  })

  describe("index()", () => {
    describe("Given an authenticated principal", () => {
      it("should render the profile template", () => {
        expect(controller.index()).toEqual({})
      })
    })
  })
})
