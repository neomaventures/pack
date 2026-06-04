import { faker } from "@faker-js/faker"
import { MockLoggerService, express } from "@neomaventures/fixtures"
import { ApplicationLoggerService } from "@neomaventures/logging"
import { RequestContextModule } from "@neomaventures/request-context"
import { type TestingModule, Test } from "@nestjs/testing"
import { type Request, type Response } from "express"
import * as jwt from "jsonwebtoken"
import { ClsService } from "nestjs-cls"
import { v4 } from "uuid"

import { InvalidCredentialsException } from "../exceptions/invalid-credentials.exception"
import { getPrincipal } from "../principal/principal.slot"
import { AuthenticationService } from "../services/authentication.service"

import { BearerAuthenticationMiddleware } from "./bearer-authentication.middleware"

const BEARER_SCHEMES = ["Bearer", "bearer", "BEARER"]
const BASIC_SCHEMES = ["Basic", "basic", "BASIC"]
const MALFORMED_BEARER_TOKENS = [
  {
    header: "Bearer",
    desc: "no token",
    err: "Invalid authentication header format",
  },
  {
    header: "Bearer ",
    desc: "no token (trailing space)",
    err: "Invalid authentication header format",
  },
  {
    header: "Bearer      ",
    desc: "no token (multiple spaces)",
    err: "Invalid authentication header format",
  },
  {
    header: "   ",
    desc: "whitespace only",
    err: `Invalid authentication scheme. Expected Bearer but got ""`,
  },
]

describe("BearerAuthenticationMiddleware", () => {
  let service: any
  let middleware: BearerAuthenticationMiddleware
  let logger: MockLoggerService
  let cls: ClsService

  beforeEach(async () => {
    service = { authenticate: jest.fn() }
    logger = new MockLoggerService()

    const module: TestingModule = await Test.createTestingModule({
      imports: [RequestContextModule.forRoot()],
      providers: [
        BearerAuthenticationMiddleware,
        { provide: AuthenticationService, useValue: service },
        { provide: ApplicationLoggerService, useValue: logger },
      ],
    }).compile()

    middleware = module.get(BearerAuthenticationMiddleware)
    cls = module.get(ClsService)
  })

  describe("When req.principal is already set", () => {
    it("should skip authentication and call next", (done) => {
      const existingPrincipal = { id: v4(), email: faker.internet.email() }
      const req = express.request({
        headers: {
          authorization: `Bearer ${jwt.sign({ sub: v4() }, v4())}`,
        },
        principal: existingPrincipal,
      })

      cls.run(() => {
        void middleware.use(
          req as unknown as Request,
          express.response() as unknown as Response,
          () => {
            expect(service.authenticate).not.toHaveBeenCalled()
            expect(req.principal).toBe(existingPrincipal)
            expect(getPrincipal()).toBe(existingPrincipal)
            done()
          },
        )
      })
    })
  })

  BEARER_SCHEMES.forEach((bearer) => {
    describe(`When called with a ${bearer} token`, () => {
      it("should extract the raw token and call service.authenticate", (done) => {
        const id = v4()
        const token = jwt.sign({ sub: id }, v4())
        const header = `${bearer} ${token}`
        const principal = { id, email: faker.internet.email() }
        service.authenticate.mockResolvedValue(principal)

        const req = express.request({
          headers: {
            authorization: header,
          },
        })

        cls.run(() => {
          void middleware.use(
            req as unknown as Request,
            express.response() as unknown as Response,
            () => {
              expect(service.authenticate).toHaveBeenCalledWith(token)
              expect(req.principal).toBe(principal)
              expect(getPrincipal()).toBe(principal)
              done()
            },
          )
        })
      })
    })
  })

  describe("When called without an Authorization header", () => {
    it("should call next without calling service", (done) => {
      const req = express.request()

      cls.run(() => {
        void middleware.use(
          req as unknown as Request,
          express.response() as unknown as Response,
          () => {
            expect(service.authenticate).not.toHaveBeenCalled()
            expect(req.principal).toBeUndefined()
            expect(getPrincipal()).toBeUndefined()
            done()
          },
        )
      })
    })
  })

  describe("When service.authenticate throws", () => {
    const token = jwt.sign({ sub: v4() }, v4())
    const bearer = `Bearer ${token}`
    const error = new Error(faker.hacker.phrase())
    beforeEach(() => {
      jest.clearAllMocks()
      service.authenticate.mockRejectedValue(error)
    })

    it("should call next without setting principal", (done) => {
      const req = express.request({
        headers: {
          authorization: bearer,
        },
      })

      cls.run(() => {
        void middleware.use(
          req as unknown as Request,
          express.response() as unknown as Response,
          () => {
            expect(req.principal).toBeUndefined()
            expect(getPrincipal()).toBeUndefined()
            done()
          },
        )
      })
    })

    it("should log a warning via the injected ApplicationLoggerService", (done) => {
      const req = express.request({
        headers: {
          authorization: bearer,
        },
      })

      cls.run(() => {
        void middleware.use(
          req as unknown as Request,
          express.response() as unknown as Response,
          () => {
            expect(logger.warn).toHaveBeenCalledWith(
              "Authentication via authorization header failed",
              { err: error },
            )
            done()
          },
        )
      })
    })
  })

  MALFORMED_BEARER_TOKENS.forEach(({ header, desc, err }) => {
    describe(`When called with ${desc}: "${header}"`, () => {
      it("should throw an InvalidCredentialsException", async () => {
        const req = express.request({
          headers: {
            authorization: header,
          },
        })

        await expect(
          cls.run(() =>
            middleware.use(
              req as unknown as Request,
              express.response() as unknown as Response,
              () => {},
            ),
          ),
        ).rejects.toMatchError(InvalidCredentialsException, { message: err })
      })
    })
  })

  BASIC_SCHEMES.forEach((basic) => {
    describe(`When called with a ${basic} token`, () => {
      it("should throw an InvalidCredentialsException", async () => {
        const req = express.request({
          headers: {
            authorization: `${basic} ${jwt.sign({ sub: v4() }, v4())}`,
          },
        })

        await expect(
          cls.run(() =>
            middleware.use(
              req as unknown as Request,
              express.response() as unknown as Response,
              () => {},
            ),
          ),
        ).rejects.toMatchError(InvalidCredentialsException, {
          message: `Invalid authentication scheme. Expected Bearer but got "${basic}"`,
        })
      })
    })
  })
})
