import { Test, type TestingModule } from "@nestjs/testing"

import { DashboardController } from "~dashboard/dashboard.controller"

describe("DashboardController", () => {
  let controller: DashboardController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
    }).compile()

    controller = module.get<DashboardController>(DashboardController)
  })

  describe("index()", () => {
    describe("When called", () => {
      it("should return undefined (template variables come from res.locals)", () => {
        expect(controller.index()).toBeUndefined()
      })
    })
  })
})
