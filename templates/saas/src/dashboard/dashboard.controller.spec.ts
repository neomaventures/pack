import { faker } from "@faker-js/faker"
import {
  type Authenticatable,
  AuthModule,
  type AuthOptions,
} from "@neomaventures/auth"
import { ManagedDatabaseModule } from "@neomaventures/managed-database"
import { Test, type TestingModule } from "@nestjs/testing"

import { Account } from "~auth/account.entity"
import { Upload } from "~auth/upload.entity"
import { DashboardController } from "~dashboard/dashboard.controller"
import { DashboardModule } from "~dashboard/dashboard.module"

const authOptions: AuthOptions = {
  secret: "test-secret",
  expiresIn: "1h",
  entity: Account,
  magicLink: {
    mailer: {
      host: "localhost",
      port: 1025,
      from: "test@example.com",
      welcome: { subject: "Welcome", html: "<p>{{token}}</p>" },
      welcomeBack: { subject: "Welcome back", html: "<p>{{token}}</p>" },
    },
  },
}

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
        ManagedDatabaseModule.forRoot([Account, Upload]),
        AuthModule.forRoot(authOptions),
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
