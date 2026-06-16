import {
  Account,
  AuthModule,
  type AuthOptions,
  OAuthToken,
} from "@neomaventures/auth"
import { fakeAccount } from "@neomaventures/auth/testing"
import { ManagedDatabaseModule } from "@neomaventures/managed-database"
import { Test, type TestingModule } from "@nestjs/testing"

import { Upload } from "~auth/upload.entity"
import { DashboardController } from "~dashboard/dashboard.controller"
import { DashboardModule } from "~dashboard/dashboard.module"

const authOptions: AuthOptions = {
  secret: "test-secret",
  expiresIn: "1h",
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

const account = fakeAccount()

describe("DashboardController", () => {
  let controller: DashboardController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ManagedDatabaseModule.forRoot([Account, OAuthToken, Upload]),
        AuthModule.forRoot(authOptions),
        DashboardModule,
      ],
    }).compile()

    controller = module.get<DashboardController>(DashboardController)
  })

  describe("index()", () => {
    describe("Given an authenticated account", () => {
      it("should return the account's email for the template", () => {
        expect(controller.index(account)).toMatchObject({
          email: account.email,
        })
      })
    })
  })
})
