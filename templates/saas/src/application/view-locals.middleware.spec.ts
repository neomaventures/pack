import { faker } from "@faker-js/faker"
import { GoogleAuthService } from "@neomaventures/auth"
import { ConfigService } from "@neomaventures/config"
import { express } from "@neomaventures/fixtures"
import { Test, type TestingModule } from "@nestjs/testing"
import { type Request, type Response } from "express"

import { ViewLocalsMiddleware } from "./view-locals.middleware"

const npmPackageName = "my-cool-app"
const npmPackageVersion = "1.2.3"

describe("ViewLocalsMiddleware", () => {
  describe("Given Google OAuth is configured", () => {
    const authorizeUrl = new URL(
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${faker.string.alphanumeric(20)}`,
    )

    let middleware: ViewLocalsMiddleware

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ViewLocalsMiddleware,
          {
            provide: ConfigService,
            useValue: { npmPackageName, npmPackageVersion },
          },
          {
            provide: GoogleAuthService,
            useValue: { authorizeUrl },
          },
        ],
      }).compile()

      middleware = module.get<ViewLocalsMiddleware>(ViewLocalsMiddleware)
    })

    describe("use()", () => {
      it("should set npmPackageName, npmPackageVersion, and googleAuthorizeUrl on res.locals", (done) => {
        const req = express.request() as unknown as Request
        const res = express.response() as unknown as Response

        middleware.use(req, res, (err) => {
          expect(err).toBeUndefined()
          expect(res.locals).toMatchObject({
            npmPackageName,
            npmPackageVersion,
            googleAuthorizeUrl: authorizeUrl.toString(),
          })
          done()
        })
      })
    })
  })

  describe("Given Google OAuth is not configured", () => {
    let middleware: ViewLocalsMiddleware

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ViewLocalsMiddleware,
          {
            provide: ConfigService,
            useValue: { npmPackageName, npmPackageVersion },
          },
          {
            provide: GoogleAuthService,
            useValue: { authorizeUrl: null },
          },
        ],
      }).compile()

      middleware = module.get<ViewLocalsMiddleware>(ViewLocalsMiddleware)
    })

    describe("use()", () => {
      it("should set googleAuthorizeUrl to null on res.locals", (done) => {
        const req = express.request() as unknown as Request
        const res = express.response() as unknown as Response

        middleware.use(req, res, (err) => {
          expect(err).toBeUndefined()
          expect(res.locals).toMatchObject({
            npmPackageName,
            npmPackageVersion,
            googleAuthorizeUrl: null,
          })
          done()
        })
      })
    })
  })
})
