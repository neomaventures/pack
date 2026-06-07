import { faker } from "@faker-js/faker"
import { MockLoggerService } from "@neomaventures/fixtures"
import {
  BadRequestException,
  HttpStatus,
  InternalServerErrorException,
} from "@nestjs/common"
import { type Response } from "express"

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
    let res: jest.Mocked<Response>

    beforeEach(() => {
      res = {
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
        redirect: jest.fn(),
      } as unknown as jest.Mocked<Response>
    })

    describe("Given a valid email", () => {
      it("should redirect to /", async () => {
        const email = faker.internet.email()

        await controller.submitSignup({ email }, res)

        expect(res.redirect).toHaveBeenCalledWith(HttpStatus.FOUND, "/")
      })

      it("should log the submission", async () => {
        const email = faker.internet.email()

        await controller.submitSignup({ email }, res)

        expect(logger.log).toHaveBeenCalledWith("Sign up submitted")
      })
    })

    describe("Given an invalid email", () => {
      it("should render the signup template with errors and the submitted email", async () => {
        const invalidEmail = faker.string.alpha(10)

        await controller.submitSignup({ email: invalidEmail }, res)

        expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
        expect(res.render).toHaveBeenCalledWith("signup", {
          errors: expect.arrayContaining([
            expect.stringContaining("email must be an email"),
          ]),
          email: invalidEmail,
        })
      })

      it("should log the validation failure", async () => {
        const invalidEmail = faker.string.alpha(10)

        await controller.submitSignup({ email: invalidEmail }, res)

        expect(logger.log).toHaveBeenCalledWith("Sign up validation failed")
      })
    })

    describe("Given an empty body", () => {
      it("should render the signup template with errors", async () => {
        await controller.submitSignup({}, res)

        expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
        expect(res.render).toHaveBeenCalledWith("signup", {
          errors: expect.arrayContaining([expect.any(String)]),
          email: "",
        })
      })
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
        expect(() => controller.error("render")).toThrow(
          InternalServerErrorException,
        )
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
