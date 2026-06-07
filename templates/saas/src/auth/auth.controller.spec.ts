import { faker } from "@faker-js/faker"
import { MagicLinkService } from "@neomaventures/auth"
import { MockLoggerService } from "@neomaventures/fixtures"
import { ApplicationLoggerService } from "@neomaventures/logging"
import { Test, type TestingModule } from "@nestjs/testing"

import { AuthController } from "./auth.controller"

const email = faker.internet.email()

describe("AuthController", () => {
  let controller: AuthController
  let logger: MockLoggerService
  let magicLinkService: { send: jest.Mock }

  beforeEach(async () => {
    logger = new MockLoggerService()
    magicLinkService = {
      send: jest.fn().mockImplementation((submitted: string) => {
        if (submitted === email) {
          return Promise.resolve(undefined)
        }
        throw new Error(`Unexpected email: ${submitted}`)
      }),
    }
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: ApplicationLoggerService, useValue: logger },
        { provide: MagicLinkService, useValue: magicLinkService },
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
    describe("Given a valid email", () => {
      it("should call magicLinkService.send() with the email and return the redirect URL", () => {
        return expect(
          controller.submitRegister({ email }),
        ).resolves.toMatchObject({
          url: `/auth/magic-link/sent?email=${encodeURIComponent(email)}`,
        })
      })
    })
  })

  describe("magicLinkSent()", () => {
    describe("Given a valid email query param", () => {
      it("should return the email for the template", () => {
        expect(controller.magicLinkSent({ email })).toMatchObject({ email })
      })
    })
  })
})
