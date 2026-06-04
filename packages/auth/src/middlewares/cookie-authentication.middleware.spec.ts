import { faker } from "@faker-js/faker"
import { MockLoggerService, express } from "@neomaventures/fixtures"
import { ApplicationLoggerService } from "@neomaventures/logging"
import { RequestContextModule } from "@neomaventures/request-context"
import { Test, type TestingModule } from "@nestjs/testing"
import { type Request, type Response } from "express"
import * as jwt from "jsonwebtoken"
import { ClsService } from "nestjs-cls"
import { v4 } from "uuid"

import { AUTH_OPTIONS } from "../auth.options"
import { getPrincipal } from "../principal/principal.slot"
import { AuthenticationService } from "../services/authentication.service"

import { CookieAuthenticationMiddleware } from "./cookie-authentication.middleware"

describe("CookieAuthenticationMiddleware", () => {
  let service: any
  let middleware: CookieAuthenticationMiddleware
  let logger: MockLoggerService
  let cls: ClsService

  const buildModule = async (cookieOptions?: {
    name?: string
  }): Promise<void> => {
    service = { authenticate: jest.fn() }
    logger = new MockLoggerService()

    const module: TestingModule = await Test.createTestingModule({
      imports: [RequestContextModule.forRoot()],
      providers: [
        CookieAuthenticationMiddleware,
        { provide: AuthenticationService, useValue: service },
        { provide: ApplicationLoggerService, useValue: logger },
        {
          provide: AUTH_OPTIONS,
          useValue: { cookie: cookieOptions },
        },
      ],
    }).compile()

    middleware = module.get(CookieAuthenticationMiddleware)
    cls = module.get(ClsService)
  }

  beforeEach(async () => {
    await buildModule()
  })

  describe("When req.principal is already set", () => {
    it("should skip authentication and call next", (done) => {
      const existingPrincipal = { id: v4(), email: faker.internet.email() }
      const sid = jwt.sign({ sub: v4() }, v4())
      const req = express.request({
        headers: {
          cookie: "auth.sid=" + encodeURIComponent(sid),
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
            done()
          },
        )
      })
    })
  })

  describe("When called with a auth.sid cookie", () => {
    it("should use it to authenticate and assign the result to req.principal", (done) => {
      const id = v4()
      const sid = jwt.sign({ sub: id }, v4())
      const principal = { id, email: faker.internet.email() }
      service.authenticate.mockResolvedValue(principal)

      const req = express.request({
        headers: {
          cookie: "auth.sid=" + encodeURIComponent(sid),
        },
      })

      cls.run(() => {
        void middleware.use(
          req as unknown as Request,
          express.response() as unknown as Response,
          () => {
            expect(service.authenticate).toHaveBeenCalledWith(sid)
            expect(req.principal).toBe(principal)
            expect(getPrincipal()).toBe(principal)
            done()
          },
        )
      })
    })
  })

  describe("When called without a cookie header", () => {
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

  describe("When called with cookies but no auth.sid", () => {
    it("should call next without calling service", (done) => {
      const req = express.request({
        headers: {
          cookie: "other=value; another=thing",
        },
      })

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
    const sid = jwt.sign({ sub: v4() }, v4())
    const error = new Error(faker.hacker.phrase())
    beforeEach(() => {
      jest.clearAllMocks()
      service.authenticate.mockRejectedValue(error)
    })

    it("should call next without setting principal", (done) => {
      const req = express.request({
        headers: {
          cookie: "auth.sid=" + encodeURIComponent(sid),
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
          cookie: "auth.sid=" + encodeURIComponent(sid),
        },
      })

      cls.run(() => {
        void middleware.use(
          req as unknown as Request,
          express.response() as unknown as Response,
          () => {
            expect(logger.warn).toHaveBeenCalledWith(
              "Authentication via cookie failed",
              { err: error },
            )
            done()
          },
        )
      })
    })
  })

  describe("When configured with a custom cookie name", () => {
    beforeEach(async () => {
      await buildModule({ name: "my-app.sid" })
    })

    it("should use the custom cookie name", (done) => {
      const id = v4()
      const sid = jwt.sign({ sub: id }, v4())
      const principal = { id, email: faker.internet.email() }
      service.authenticate.mockResolvedValue(principal)

      const req = express.request({
        headers: {
          cookie: "my-app.sid=" + encodeURIComponent(sid),
        },
      })

      cls.run(() => {
        void middleware.use(
          req as unknown as Request,
          express.response() as unknown as Response,
          () => {
            expect(service.authenticate).toHaveBeenCalledWith(sid)
            expect(req.principal).toBe(principal)
            expect(getPrincipal()).toBe(principal)
            done()
          },
        )
      })
    })

    it("should not match the default auth.sid cookie", (done) => {
      const sid = jwt.sign({ sub: v4() }, v4())

      const req = express.request({
        headers: {
          cookie: "auth.sid=" + encodeURIComponent(sid),
        },
      })

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
})
