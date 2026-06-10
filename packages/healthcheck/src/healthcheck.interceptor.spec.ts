import { callHandler, executionContext, express } from "@neomaventures/fixtures"
import { Reflector } from "@nestjs/core"
import { firstValueFrom } from "rxjs"

import { type HealthService } from "./health.service"
import { HEALTHCHECK_METADATA_KEY } from "./healthcheck.constants"
import { HealthcheckInterceptor } from "./healthcheck.interceptor"

const buildContext = (
  handler: () => void,
  res = express.response(),
  type: "http" | "rpc" | "ws" = "http",
): ReturnType<typeof executionContext> & { getType: () => string } => {
  const req = express.request({ res })
  const ctx = executionContext(req, res, handler)
  // @neomaventures/fixtures' executionContext doesn't include getType(); extend
  // here. Worth promoting upstream — tracked separately.
  return { ...ctx, getType: jest.fn().mockReturnValue(type) }
}

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
        const ctx = buildContext(handler, res)

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

      beforeEach(() => {
        Reflect.defineMetadata(HEALTHCHECK_METADATA_KEY, true, handler)
        healthService.check.mockResolvedValue({ http: "ok", database: "ok" })
      })

      it("should set the response status to 200", async () => {
        const res = express.response()
        const ctx = buildContext(handler, res)

        const result$ = interceptor.intercept(ctx as never, callHandler())
        await firstValueFrom(result$)

        expect(res.statusCode).toBe(200)
      })

      it("should emit the aggregated HealthResult", async () => {
        const ctx = buildContext(handler)

        const result$ = interceptor.intercept(ctx as never, callHandler())

        await expect(firstValueFrom(result$)).resolves.toEqual({
          http: "ok",
          database: "ok",
        })
      })
    })

    describe("Given @HealthCheck() metadata and the database probe errors", () => {
      const handler = (): void => {}

      beforeEach(() => {
        Reflect.defineMetadata(HEALTHCHECK_METADATA_KEY, true, handler)
        healthService.check.mockResolvedValue({
          http: "ok",
          database: "error",
        })
      })

      it("should set the response status to 503", async () => {
        const res = express.response()
        const ctx = buildContext(handler, res)

        const result$ = interceptor.intercept(ctx as never, callHandler())
        await firstValueFrom(result$)

        expect(res.statusCode).toBe(503)
      })

      it("should emit the HealthResult with database: error", async () => {
        const ctx = buildContext(handler)

        const result$ = interceptor.intercept(ctx as never, callHandler())

        await expect(firstValueFrom(result$)).resolves.toEqual({
          http: "ok",
          database: "error",
        })
      })
    })

    describe("Given @HealthCheck() metadata and no DataSource (http only)", () => {
      const handler = (): void => {}

      beforeEach(() => {
        Reflect.defineMetadata(HEALTHCHECK_METADATA_KEY, true, handler)
        healthService.check.mockResolvedValue({ http: "ok" })
      })

      it("should set the response status to 200", async () => {
        const res = express.response()
        const ctx = buildContext(handler, res)

        const result$ = interceptor.intercept(ctx as never, callHandler())
        await firstValueFrom(result$)

        expect(res.statusCode).toBe(200)
      })
    })

    describe("Given @HealthCheck() metadata on a non-HTTP route", () => {
      it("should throw because non-HTTP contexts are not supported", () => {
        const handler = (): void => {}
        Reflect.defineMetadata(HEALTHCHECK_METADATA_KEY, true, handler)

        const ctx = buildContext(handler, undefined, "rpc")

        expect(() =>
          interceptor.intercept(ctx as never, callHandler()),
        ).toThrow(/only supports HTTP routes/)
        expect(healthService.check).not.toHaveBeenCalled()
      })
    })
  })
})
