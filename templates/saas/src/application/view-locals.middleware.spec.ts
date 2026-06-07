import { express } from "@neomaventures/fixtures"
import { type Request, type Response } from "express"

import { ViewLocalsMiddleware } from "./view-locals.middleware"

describe("ViewLocalsMiddleware", () => {
  const npmPackageName = "my-cool-app"
  const npmPackageVersion = "1.2.3"

  let middleware: ViewLocalsMiddleware

  beforeEach(() => {
    middleware = new ViewLocalsMiddleware({ npmPackageName, npmPackageVersion } as any)
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
