import { faker } from "@faker-js/faker"
import { MockLoggerService } from "@neomaventures/fixtures"
import { ApplicationLoggerService } from "@neomaventures/logging"
import { Test, type TestingModule } from "@nestjs/testing"

import { AuthController } from "./auth.controller"

describe("AuthController", () => {
  let controller: AuthController
  let logger: MockLoggerService

  beforeEach(async () => {
    logger = new MockLoggerService()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: ApplicationLoggerService, useValue: logger },
      ],
    }).compile()

    controller = module.get<AuthController>(AuthController)
  })

  describe("register()", () => {
    it("should log that the registration page was requested", () => {
      controller.register()

      expect(logger.log).toHaveBeenCalledWith("Registration page requested")
    })
  })

  describe("submitRegister()", () => {
    it("should log the submitted email", () => {
      const email = faker.internet.email()

      controller.submitRegister({ email })

      expect(logger.log).toHaveBeenCalledWith(
        `Registration submitted for ${email}`,
      )
    })
  })
})
