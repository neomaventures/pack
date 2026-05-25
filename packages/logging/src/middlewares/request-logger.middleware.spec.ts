import { express } from "@neoma/fixtures"
import { LoggingModule, RequestLoggerService } from "@neoma/logging"
import { REQUEST } from "@nestjs/core"
import { Test, type TestingModule } from "@nestjs/testing"
import { type Request, type Response } from "express"

import { RequestLoggerMiddleware } from "./request-logger.middleware"

describe("RequestLoggerMiddleware", () => {
  let req: Partial<Request>
  let middleware: RequestLoggerMiddleware
  beforeEach(async () => {
    req = express.request() as unknown as Partial<Request>
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggingModule.forRoot()],
      providers: [{ provide: REQUEST, useValue: req }],
    }).compile()

    middleware = await module.resolve(RequestLoggerMiddleware)
  })

  describe("use", () => {
    describe("When it's called with a Request parameter", () => {
      beforeEach((done) => {
        middleware.use(<Request>req, <Response>req.res, done)
      })

      it("Then it should assign a RequestLoggerService to request's logger property.", () => {
        expect(req.logger).toBeInstanceOf(RequestLoggerService)
      })
    })
  })
})
