import { faker } from "@faker-js/faker"
import { type Authenticatable, AUTH_OPTIONS } from "@neomaventures/auth"
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
      providers: [
        // `@Authenticated()` registers `AuthenticatedGuard` via `UseGuards`,
        // so Nest must resolve its `AUTH_OPTIONS` dep when building the
        // testing module. The guard is never invoked in these unit tests
        // (we call the handler directly), so an empty options object is
        // sufficient.
        { provide: AUTH_OPTIONS, useValue: {} },
      ],
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
