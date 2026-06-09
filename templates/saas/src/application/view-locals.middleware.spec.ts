import { faker } from "@faker-js/faker"
import { ConfigService } from "@neomaventures/config"
import { express } from "@neomaventures/fixtures"
import { Test, type TestingModule } from "@nestjs/testing"
import { type Request, type Response } from "express"

import { ViewLocalsMiddleware } from "./view-locals.middleware"

const npmPackageName = "my-cool-app"
const npmPackageVersion = "1.2.3"
const appUrl = "http://localhost:3000"

describe("ViewLocalsMiddleware", () => {
  describe("Given Google OAuth is configured", () => {
    const googleClientId = faker.string.alphanumeric(20)

    let middleware: ViewLocalsMiddleware

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ViewLocalsMiddleware,
          {
            provide: ConfigService,
            useValue: {
              npmPackageName,
              npmPackageVersion,
              googleClientId,
              appUrl,
            },
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
          })
          expect(res.locals.googleAuthorizeUrl).toContain(
            "https://accounts.google.com/o/oauth2/v2/auth",
          )
          expect(res.locals.googleAuthorizeUrl).toContain(
            `client_id=${googleClientId}`,
          )
          expect(res.locals.googleAuthorizeUrl).toContain(
            encodeURIComponent(`${appUrl}/auth/google/callback`),
          )
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
            useValue: {
              npmPackageName,
              npmPackageVersion,
              googleClientId: "",
              appUrl,
            },
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
          })
          expect(res.locals.googleAuthorizeUrl).toBeNull()
          done()
        })
      })
    })
  })
})
