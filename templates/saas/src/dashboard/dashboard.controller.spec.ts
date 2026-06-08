import { faker } from "@faker-js/faker"
import { type Authenticatable } from "@neomaventures/auth"
import { Test, type TestingModule } from "@nestjs/testing"

import { DashboardController } from "~dashboard/dashboard.controller"

const principal: Authenticatable = {
  id: faker.string.uuid(),
  email: faker.internet.email(),
  permissions: [],
}

describe("DashboardController", () => {
  let controller: DashboardController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
    }).compile()

    controller = module.get<DashboardController>(DashboardController)
  })

  describe("index()", () => {
    describe("Given an authenticated principal", () => {
      it("should return the principal's email for the template", () => {
        expect(controller.index(principal)).toMatchObject({
          email: principal.email,
        })
      })
    })
  })
})
