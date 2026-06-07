import { type Request, type Response } from "express"

import { version } from "~fixtures/package-version"

import { ViewLocalsMiddleware } from "./view-locals.middleware"

describe("ViewLocalsMiddleware", () => {
  let middleware: ViewLocalsMiddleware

  beforeEach(() => {
    middleware = new ViewLocalsMiddleware()
  })

  describe("use()", () => {
    describe("Given a request passes through the middleware", () => {
      it("should set appName and version on res.locals", () => {
        const req = {} as Request
        const res = { locals: {} } as Response
        const next = jest.fn()

        middleware.use(req, res, next)

        expect(res.locals).toMatchObject({
          appName: "SaaS Template",
          version,
        })
      })

      it("should call next to pass control", () => {
        const req = {} as Request
        const res = { locals: {} } as Response
        const next = jest.fn()

        middleware.use(req, res, next)

        expect(next).toHaveBeenCalledTimes(1)
      })
    })

    describe("Given npm_package_version is not set", () => {
      it("should default version to 0.0.0", () => {
        const original = process.env.npm_package_version
        delete process.env.npm_package_version

        const req = {} as Request
        const res = { locals: {} } as Response
        const next = jest.fn()

        middleware.use(req, res, next)

        expect(res.locals).toMatchObject({
          appName: "SaaS Template",
          version: "0.0.0",
        })

        process.env.npm_package_version = original
      })
    })
  })
})
