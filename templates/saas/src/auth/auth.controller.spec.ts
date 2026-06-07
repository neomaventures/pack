import { faker } from "@faker-js/faker"
import { MockLoggerService } from "@neomaventures/fixtures"

import { AuthController } from "./auth.controller"

describe("AuthController", () => {
  let controller: AuthController
  let logger: MockLoggerService

  beforeEach(() => {
    logger = new MockLoggerService()
    controller = new AuthController(logger as any)
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

      expect(logger.log).toHaveBeenCalledWith(`Registration submitted for ${email}`)
    })
  })
})
