import { express } from "@neoma/fixtures"
import { Test } from "@nestjs/testing"
import { type Request, type Response } from "express"
import { ClsService } from "nestjs-cls"

import { getRequest, RequestContextModule } from "@neoma/request-context"

import { RequestContextMiddleware } from "./request-context.middleware"

describe("RequestContextMiddleware", () => {
  let middleware: RequestContextMiddleware
  let cls: ClsService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [RequestContextModule.forRoot()],
    }).compile()

    middleware = module.get(RequestContextMiddleware)
    cls = module.get(ClsService)
  })

  describe("Given an incoming request", () => {
    describe("When use() runs the downstream stack", () => {
      it("Then getRequest() inside next() returns that request", () => {
        const request = express.request() as unknown as Request
        let seenInNext: Request | undefined

        middleware.use(request, {} as Response, () => {
          seenInNext = getRequest()
        })

        expect(seenInNext).toBe(request)
      })

      it("Then the context is opened with run(), not enterWith()", () => {
        const runSpy = jest.spyOn(cls, "run")
        const enterWithSpy = jest.spyOn(cls, "enterWith")
        const request = express.request() as unknown as Request

        middleware.use(request, {} as Response, () => {})

        expect(runSpy).toHaveBeenCalledTimes(1)
        expect(enterWithSpy).not.toHaveBeenCalled()

        runSpy.mockRestore()
        enterWithSpy.mockRestore()
      })
    })
  })

  describe("Given the downstream stack has completed", () => {
    describe("When getRequest() is called outside the run() callback", () => {
      it("Then the request does not leak out of the context", () => {
        const request = express.request() as unknown as Request

        middleware.use(request, {} as Response, () => {})

        expect(getRequest()).toBeUndefined()
      })
    })
  })
})
