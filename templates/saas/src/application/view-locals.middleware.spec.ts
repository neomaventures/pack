import { ConfigService } from "@neomaventures/config"
import { express } from "@neomaventures/fixtures"
import { Test, type TestingModule } from "@nestjs/testing"
import { type Request, type Response } from "express"

import { ViewLocalsMiddleware } from "./view-locals.middleware"

describe("ViewLocalsMiddleware", () => {
  const npmPackageName = "my-cool-app"
  const npmPackageVersion = "1.2.3"

  let middleware: ViewLocalsMiddleware

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViewLocalsMiddleware,
        {
          provide: ConfigService,
          useValue: { npmPackageName, npmPackageVersion },
        },
      ],
    }).compile()

    middleware = module.get<ViewLocalsMiddleware>(ViewLocalsMiddleware)
  })

  describe("use()", () => {
    describe("Given a request passes through the middleware", () => {
      it("should set npmPackageName and npmPackageVersion on res.locals", (done) => {
        const req = express.request() as unknown as Request
        const res = express.response() as unknown as Response

        middleware.use(req, res, (err) => {
          expect(err).toBeUndefined()
          expect(res.locals).toMatchObject({
            npmPackageName,
            npmPackageVersion,
          })
          done()
        })
      })
    })
  })
})
