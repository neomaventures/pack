import { callHandler, executionContext, express } from "@neomaventures/fixtures"
import { Reflector } from "@nestjs/core"
import { firstValueFrom } from "rxjs"

import { type HealthService } from "./health.service"
import {
  HEALTHCHECK_METADATA_KEY,
  HEALTHCHECK_REQUEST_KEY,
} from "./healthcheck.constants"
import { HealthcheckInterceptor } from "./healthcheck.interceptor"

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
        const downstream = callHandler({ untouched: true })
        const handleSpy = jest.spyOn(downstream, "handle")
        const handler = (): void => {}
        const res = express.response()
        const ctx = executionContext(undefined, res, handler)

        const result$ = interceptor.intercept(ctx as never, downstream)

        await expect(firstValueFrom(result$)).resolves.toEqual({
          untouched: true,
        })
        expect(handleSpy).toHaveBeenCalled()
        expect(healthService.check).not.toHaveBeenCalled()
        expect(res.statusCode).toBeUndefined()
      })
    })

    describe("Given @HealthCheck() metadata and all probes are ok", () => {
      const handler = (): void => {}
      const healthResult = {
        http: "ok",
        database: "ok",
        checkedAt: "2026-06-12T00:00:00.000Z",
      }

      beforeEach(() => {
        Reflect.defineMetadata(HEALTHCHECK_METADATA_KEY, true, handler)
        healthService.check.mockResolvedValue(healthResult)
      })

      it("should set the response status to 200", async () => {
        const res = express.response()
        const ctx = executionContext(undefined, res, handler)

        const result$ = interceptor.intercept(ctx as never, callHandler())
        await firstValueFrom(result$)

        expect(res.statusCode).toBe(200)
      })

      it("should attach the HealthResult to the request under HEALTHCHECK_REQUEST_KEY", async () => {
        const req = express.request()
        const ctx = executionContext(req, undefined, handler)

        const result$ = interceptor.intercept(ctx as never, callHandler())
        await firstValueFrom(result$)

        expect(
          (req as unknown as Record<string, unknown>)[HEALTHCHECK_REQUEST_KEY],
        ).toEqual(healthResult)
      })

      it("should pass through to next.handle() (controller runs, not short-circuited)", async () => {
        const downstream = callHandler({ fromController: "rendered" })
        const handleSpy = jest.spyOn(downstream, "handle")
        const ctx = executionContext(undefined, undefined, handler)

        const result$ = interceptor.intercept(ctx as never, downstream)
        const emitted = await firstValueFrom(result$)

        expect(handleSpy).toHaveBeenCalled()
        expect(emitted).toEqual({ fromController: "rendered" })
      })
    })

    describe("Given @HealthCheck() metadata and the database probe errors", () => {
      const handler = (): void => {}
      const errorResult = {
        http: "ok",
        database: "error",
        checkedAt: "2026-06-12T00:00:00.000Z",
      }

      beforeEach(() => {
        Reflect.defineMetadata(HEALTHCHECK_METADATA_KEY, true, handler)
        healthService.check.mockResolvedValue(errorResult)
      })

      it("should set the response status to 503", async () => {
        const res = express.response()
        const ctx = executionContext(undefined, res, handler)

        const result$ = interceptor.intercept(ctx as never, callHandler())
        await firstValueFrom(result$)

        expect(res.statusCode).toBe(503)
      })

      it("should still pass through to the controller and attach the error result", async () => {
        const req = express.request()
        const downstream = callHandler({ shown: "error page" })
        const ctx = executionContext(req, undefined, handler)

        const emitted = await firstValueFrom(
          interceptor.intercept(ctx as never, downstream),
        )

        expect(
          (req as unknown as Record<string, unknown>)[HEALTHCHECK_REQUEST_KEY],
        ).toEqual(errorResult)
        expect(emitted).toEqual({ shown: "error page" })
      })
    })

    describe("Given @HealthCheck() metadata and no DataSource (http only)", () => {
      const handler = (): void => {}

      beforeEach(() => {
        Reflect.defineMetadata(HEALTHCHECK_METADATA_KEY, true, handler)
        healthService.check.mockResolvedValue({
          http: "ok",
          checkedAt: "2026-06-12T00:00:00.000Z",
        })
      })

      it("should set the response status to 200", async () => {
        const res = express.response()
        const ctx = executionContext(undefined, res, handler)

        const result$ = interceptor.intercept(ctx as never, callHandler())
        await firstValueFrom(result$)

        expect(res.statusCode).toBe(200)
      })
    })

    describe("Given @HealthCheck() metadata on a non-HTTP route", () => {
      it("should throw because non-HTTP contexts are not supported", () => {
        const handler = (): void => {}
        Reflect.defineMetadata(HEALTHCHECK_METADATA_KEY, true, handler)

        const ctx = executionContext(
          undefined,
          undefined,
          handler,
          undefined,
          "rpc",
        )

        expect(() =>
          interceptor.intercept(ctx as never, callHandler()),
        ).toThrow(/only supports HTTP routes/)
        expect(healthService.check).not.toHaveBeenCalled()
      })
    })
  })
})
