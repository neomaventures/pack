import { faker } from "@faker-js/faker"
import {
  GoogleAuthService,
  MagicLinkService,
  SessionService,
} from "@neomaventures/auth"
import { entities } from "@neomaventures/auth/testing"
import { express } from "@neomaventures/fixtures"
import { ApplicationLogger } from "@neomaventures/logging"
import { MockLogger } from "@neomaventures/logging/testing"
import { Test, type TestingModule } from "@nestjs/testing"
import { type Response } from "express"

import { AuthController } from "./auth.controller"

const email = faker.internet.email()
const token = faker.string.alphanumeric(32)
const account = entities.account({ email })

describe("AuthController", () => {
  let controller: AuthController
  let logger: MockLogger
  let magicLinkService: { send: jest.Mock; verify: jest.Mock }
  let sessionService: { create: jest.Mock; clear: jest.Mock }

  beforeEach(async () => {
    logger = new MockLogger()
    magicLinkService = {
      send: jest.fn().mockImplementation((submitted: string) => {
        if (submitted === email) {
          return Promise.resolve(undefined)
        }
        throw new Error(`Unexpected email: ${submitted}`)
      }),
      verify: jest.fn().mockImplementation((submitted: string) => {
        if (submitted === token) {
          return Promise.resolve({ account, isNewAccount: true })
        }
        throw new Error(`Unexpected token: ${submitted}`)
      }),
    }
    sessionService = {
      create: jest.fn().mockImplementation((_res: Response, arg: unknown) => {
        if (arg === account) {
          return { token: faker.string.alphanumeric(32) }
        }
        throw new Error("Unexpected account")
      }),
      clear: jest.fn(),
    }
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: ApplicationLogger, useValue: logger },
        { provide: MagicLinkService, useValue: magicLinkService },
        { provide: SessionService, useValue: sessionService },
        // GoogleAuthService is called by the @GoogleCallback() interceptor,
        // not the controller. This mock only satisfies the DI container.
        { provide: GoogleAuthService, useValue: { authenticate: jest.fn() } },
      ],
    }).compile()

    controller = module.get<AuthController>(AuthController)
  })

  describe("register()", () => {
    it("should log that the registration page was requested", () => {
      controller.register()
      expect(logger.info).toHaveBeenCalledWith("Registration page requested")
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
      it("should verify the token, create a session, and return redirect to /dashboard", async () => {
        const result = await controller.callback(
          token,
          express.response() as unknown as Response,
        )

        expect(result).toMatchObject({ url: "/dashboard" })
      })
    })
  })

  describe("googleCallback()", () => {
    describe("Given a valid Google auth result", () => {
      it("should create a session and return redirect to /dashboard", () => {
        const res = express.response() as unknown as Response
        const googleAuthResult = {
          account,
          isNewAccount: true,
          profile: { sub: faker.string.numeric(10) },
        }

        const result = controller.googleCallback(googleAuthResult, res)

        expect(result).toMatchObject({ url: "/dashboard" })
        expect(sessionService.create).toHaveBeenCalledWith(res, account)
      })
    })
  })

  describe("logout()", () => {
    describe("When called", () => {
      it("should clear the session", () => {
        const res = express.response() as unknown as Response

        controller.logout(res)

        expect(sessionService.clear).toHaveBeenCalledWith(res)
      })
    })
  })
})
