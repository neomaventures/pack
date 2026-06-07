import { faker } from "@faker-js/faker"
import { MockLoggerService } from "@neomaventures/fixtures"
import { BadRequestException, InternalServerErrorException } from "@nestjs/common"

import { ApplicationController } from "./application.controller"

describe("ApplicationController", () => {
  let controller: ApplicationController
  let logger: MockLoggerService

  beforeEach(() => {
    logger = new MockLoggerService()
    controller = new ApplicationController(logger as any)
  })

  describe("index()", () => {
    it("should log that the welcome page was requested", () => {
      controller.index()

      expect(logger.log).toHaveBeenCalledWith("Welcome page requested")
    })
  })

  describe("signup()", () => {
    it("should log that the sign up page was requested", () => {
      controller.signup()

      expect(logger.log).toHaveBeenCalledWith("Sign up page requested")
    })
  })

  describe("submitSignup()", () => {
    it("should log the submitted email", () => {
      const email = faker.internet.email()

      controller.submitSignup({ email })

      expect(logger.log).toHaveBeenCalledWith(`Sign up submitted for ${email}`)
    })
  })

  describe("error()", () => {
    describe("Given type is 'redirect'", () => {
      it("should throw a BadRequestException", () => {
        expect(() => controller.error("redirect")).toThrow(BadRequestException)
      })
    })

    describe("Given type is 'render'", () => {
      it("should throw an InternalServerErrorException", () => {
        expect(() => controller.error("render")).toThrow(InternalServerErrorException)
      })
    })

    describe("Given type is unknown", () => {
      it("should throw a BadRequestException", () => {
        expect(() => controller.error("invalid")).toThrow(BadRequestException)
      })
    })

    describe("Given type is not provided", () => {
      it("should throw a BadRequestException", () => {
        expect(() => controller.error()).toThrow(BadRequestException)
      })
    })
  })
})
