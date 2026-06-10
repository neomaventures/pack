import { type CallHandler, type ExecutionContext } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { firstValueFrom, of } from "rxjs"

import { type HealthService } from "./health.service"
import { HealthcheckInterceptor } from "./healthcheck.interceptor"

type ResponseLike = { status: jest.Mock }

const buildContext = (
  handler: () => void,
  response: ResponseLike,
): ExecutionContext =>
  ({
    getHandler: (): (() => void) => handler,
    switchToHttp: (): { getResponse: <T>() => T } => ({
      getResponse: <T>(): T => response as unknown as T,
    }),
  }) as unknown as ExecutionContext

describe("HealthcheckInterceptor", () => {
  let reflector: Reflector
  let healthService: { check: jest.Mock }
  let interceptor: HealthcheckInterceptor

  beforeEach(() => {
    reflector = new Reflector()
    healthService = { check: jest.fn() }
    interceptor = new HealthcheckInterceptor(
      reflector,
      healthService as unknown as HealthService,
    )
  })

  describe("intercept()", () => {
    describe("Given no @HealthCheck() metadata on the handler", () => {
      it("should delegate to next.handle() and not call HealthService.check", async () => {
        const downstream = of({ untouched: true })
        const next: CallHandler = {
          handle: jest.fn().mockReturnValue(downstream),
        }
        const handler = (): void => {}
        const response: ResponseLike = { status: jest.fn() }

        const result$ = interceptor.intercept(
          buildContext(handler, response),
          next,
        )

        await expect(firstValueFrom(result$)).resolves.toEqual({
          untouched: true,
        })
        expect(next.handle).toHaveBeenCalled()
        expect(healthService.check).not.toHaveBeenCalled()
        expect(response.status).not.toHaveBeenCalled()
      })
    })

    describe("Given @HealthCheck() metadata and all probes are ok", () => {
      const handler = (): void => {}

      beforeEach(() => {
        Reflect.defineMetadata("neoma:healthcheck", true, handler)
        healthService.check.mockResolvedValue({ http: "ok", database: "ok" })
      })

      it("should set the response status to 200", async () => {
        const response: ResponseLike = { status: jest.fn() }
        const next: CallHandler = { handle: jest.fn() }

        const result$ = interceptor.intercept(
          buildContext(handler, response),
          next,
        )
        await firstValueFrom(result$)

        expect(response.status).toHaveBeenCalledWith(200)
      })

      it("should emit the aggregated HealthResult", async () => {
        const response: ResponseLike = { status: jest.fn() }
        const next: CallHandler = { handle: jest.fn() }

        const result$ = interceptor.intercept(
          buildContext(handler, response),
          next,
        )

        await expect(firstValueFrom(result$)).resolves.toEqual({
          http: "ok",
          database: "ok",
        })
      })
    })

    describe("Given @HealthCheck() metadata and the database probe errors", () => {
      const handler = (): void => {}

      beforeEach(() => {
        Reflect.defineMetadata("neoma:healthcheck", true, handler)
        healthService.check.mockResolvedValue({
          http: "ok",
          database: "error",
        })
      })

      it("should set the response status to 503", async () => {
        const response: ResponseLike = { status: jest.fn() }
        const next: CallHandler = { handle: jest.fn() }

        const result$ = interceptor.intercept(
          buildContext(handler, response),
          next,
        )
        await firstValueFrom(result$)

        expect(response.status).toHaveBeenCalledWith(503)
      })

      it("should emit the HealthResult with database: error", async () => {
        const response: ResponseLike = { status: jest.fn() }
        const next: CallHandler = { handle: jest.fn() }

        const result$ = interceptor.intercept(
          buildContext(handler, response),
          next,
        )

        await expect(firstValueFrom(result$)).resolves.toEqual({
          http: "ok",
          database: "error",
        })
      })
    })

    describe("Given @HealthCheck() metadata and no DataSource (http only)", () => {
      const handler = (): void => {}

      beforeEach(() => {
        Reflect.defineMetadata("neoma:healthcheck", true, handler)
        healthService.check.mockResolvedValue({ http: "ok" })
      })

      it("should set the response status to 200", async () => {
        const response: ResponseLike = { status: jest.fn() }
        const next: CallHandler = { handle: jest.fn() }

        const result$ = interceptor.intercept(
          buildContext(handler, response),
          next,
        )
        await firstValueFrom(result$)

        expect(response.status).toHaveBeenCalledWith(200)
      })
    })
  })
})
