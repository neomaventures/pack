/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { executionContext, express } from "@neomaventures/fixtures"
import {
  Controller,
  type ExecutionContext,
  Get,
  HttpStatus,
} from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"
import { lastValueFrom, type Observable, of, throwError } from "rxjs"

import { type LoggingConfiguration } from "../interfaces"
import { ApplicationLoggerService } from "../services"
import { LOGGING_MODULE_OPTIONS } from "../symbols"

import { RequestLoggerInterceptor } from "./request-logger.interceptor"

@Controller("test")
class TestController {
  @Get()
  getTest() {
    return { message: "success" }
  }
}

const routeMetaData = {
  controller: { name: "TestController", path: "test" },
  handler: { name: "getTest", path: "/" },
}

const invocation = ({
  response = of({ message: "success" }) as Observable<unknown>,
}: { response?: Observable<unknown> } = {}) => {
  const req = express.request()
  const ctx = executionContext(req, undefined, {
    controller: TestController,
    method: "getTest",
  }) as ExecutionContext
  const handler = { handle: () => response }
  return { req, ctx, handler }
}

const build = async (
  config: Partial<LoggingConfiguration> = {},
): Promise<{
  interceptor: RequestLoggerInterceptor
  logger: jest.Mocked<Pick<ApplicationLoggerService, "debug" | "error">>
}> => {
  const loggerMock = { debug: jest.fn(), error: jest.fn() }
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      RequestLoggerInterceptor,
      { provide: LOGGING_MODULE_OPTIONS, useValue: config },
      { provide: ApplicationLoggerService, useValue: loggerMock },
    ],
  }).compile()

  return {
    interceptor: module.get(RequestLoggerInterceptor),
    logger: loggerMock as any,
  }
}

describe("RequestLoggerInterceptor", () => {
  describe("intercept()", () => {
    describe("Given the handler succeeds", () => {
      let interceptor: RequestLoggerInterceptor
      let logger: jest.Mocked<Pick<ApplicationLoggerService, "debug" | "error">>

      beforeEach(async () => {
        ;({ interceptor, logger } = await build())
      })

      it("logs the dispatch with controller and handler metadata", async () => {
        const { ctx, handler } = invocation()

        await lastValueFrom(interceptor.intercept(ctx, handler))

        expect(logger.debug).toHaveBeenNthCalledWith(
          1,
          "Processing an incoming request and dispatching it to a route handler.",
          expect.objectContaining(routeMetaData),
        )
      })

      it("logs the completion with res, duration, and metadata", async () => {
        const { ctx, handler } = invocation()

        await lastValueFrom(interceptor.intercept(ctx, handler))

        expect(logger.debug).toHaveBeenNthCalledWith(
          2,
          "Processed an incoming request that was successfully handled by a route handler.",
          expect.objectContaining({
            ...routeMetaData,
            res: expect.any(Object),
            duration: expect.stringMatching(/^\d+ms$/),
          }),
        )
      })

      it("preserves the handler response unchanged", async () => {
        const handlerResponse = { message: "ok", code: HttpStatus.OK }
        const { ctx, handler } = invocation({ response: of(handlerResponse) })

        const received = await lastValueFrom(
          interceptor.intercept(ctx, handler),
        )

        expect(received).toEqual(handlerResponse)
      })
    })

    describe("Given the handler throws and logErrors is true", () => {
      let interceptor: RequestLoggerInterceptor
      let logger: jest.Mocked<Pick<ApplicationLoggerService, "debug" | "error">>

      beforeEach(async () => {
        ;({ interceptor, logger } = await build({ logErrors: true }))
      })

      it("logs the error with metadata, duration, and the error", async () => {
        const { ctx, handler } = invocation({
          response: throwError(() => new Error("Test error")),
        })

        await expect(
          lastValueFrom(interceptor.intercept(ctx, handler)),
        ).rejects.toThrow("Test error")

        expect(logger.error).toHaveBeenCalledWith(
          "Error processing an incoming request in the route handler.",
          expect.objectContaining({
            ...routeMetaData,
            duration: expect.stringMatching(/^\d+ms$/),
            err: expect.objectContaining({ message: "Test error" }),
          }),
        )
      })

      it("propagates the error to the caller", async () => {
        const { ctx, handler } = invocation({
          response: throwError(() => new Error("Test error")),
        })

        await expect(
          lastValueFrom(interceptor.intercept(ctx, handler)),
        ).rejects.toThrow("Test error")
      })
    })

    describe("Given the handler throws and logErrors is false", () => {
      let interceptor: RequestLoggerInterceptor
      let logger: jest.Mocked<Pick<ApplicationLoggerService, "debug" | "error">>

      beforeEach(async () => {
        ;({ interceptor, logger } = await build({ logErrors: false }))
      })

      it("does not log the error", async () => {
        const { ctx, handler } = invocation({
          response: throwError(() => new Error("Test error")),
        })

        await expect(
          lastValueFrom(interceptor.intercept(ctx, handler)),
        ).rejects.toThrow("Test error")

        expect(logger.error).not.toHaveBeenCalled()
      })

      it("propagates the error to the caller", async () => {
        const { ctx, handler } = invocation({
          response: throwError(() => new Error("Test error")),
        })

        await expect(
          lastValueFrom(interceptor.intercept(ctx, handler)),
        ).rejects.toThrow("Test error")
      })
    })
  })
})
