import { faker } from "@faker-js/faker"
import {
  type Authenticatable,
  AuthModule,
  AUTH_TEST_OPTIONS,
} from "@neomaventures/auth"
import { ManagedDatabaseModule } from "@neomaventures/managed-database"
import { Test, type TestingModule } from "@nestjs/testing"

import { Account } from "~auth/account.entity"
import { DashboardController } from "~dashboard/dashboard.controller"
import { DashboardModule } from "~dashboard/dashboard.module"

const principal: Authenticatable = {
  id: faker.string.uuid(),
  email: faker.internet.email(),
  permissions: [],
}

describe("DashboardController", () => {
  let controller: DashboardController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ManagedDatabaseModule.forRoot([Account]),
        AuthModule.forRoot(AUTH_TEST_OPTIONS),
        DashboardModule,
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
