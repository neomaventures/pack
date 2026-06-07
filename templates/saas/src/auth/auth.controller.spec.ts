import { faker } from "@faker-js/faker"
import { MagicLinkService, SessionService } from "@neomaventures/auth"
import { express, MockLoggerService } from "@neomaventures/fixtures"
import { ApplicationLoggerService } from "@neomaventures/logging"
import { Test, type TestingModule } from "@nestjs/testing"
import { type Response } from "express"

import { AuthController } from "./auth.controller"

const email = faker.internet.email()
const token = faker.string.alphanumeric(32)
const entity = { id: faker.string.uuid(), email, permissions: [] }
const sessionToken = faker.string.alphanumeric(64)

describe("AuthController", () => {
  let controller: AuthController
  let logger: MockLoggerService
  let magicLinkService: { send: jest.Mock; verify: jest.Mock }
  let sessionService: { create: jest.Mock }

  beforeEach(async () => {
    logger = new MockLoggerService()
    magicLinkService = {
      send: jest.fn().mockImplementation((submitted: string) => {
        if (submitted === email) {
          return Promise.resolve(undefined)
        }
        throw new Error(`Unexpected email: ${submitted}`)
      }),
      verify: jest.fn().mockImplementation((submitted: string) => {
        if (submitted === token) {
          return Promise.resolve({ entity, isNewUser: true })
        }
        throw new Error(`Unexpected token: ${submitted}`)
      }),
    }
    sessionService = {
      create: jest.fn().mockImplementation((res: Response, account: unknown) => {
        if (account === entity) {
          return { token: sessionToken }
        }
        throw new Error("Unexpected account")
      }),
    }
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: ApplicationLoggerService, useValue: logger },
        { provide: MagicLinkService, useValue: magicLinkService },
        { provide: SessionService, useValue: sessionService },
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

  describe("callback()", () => {
    describe("Given a valid token", () => {
      it("should verify the token, create a session, and return redirect to /", async () => {
        const res = express.response() as unknown as Response

        const result = await controller.callback(token, res)

        expect(sessionService.create).toHaveBeenCalledWith(res, entity)
        expect(result).toMatchObject({ url: "/" })
      })
    })
  })
})
