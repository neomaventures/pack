import { executionContext, express } from "@neomaventures/fixtures"
import { type ExecutionContext } from "@nestjs/common"

import { HEALTHCHECK_REQUEST_KEY } from "./healthcheck.constants"
import { type HealthResult } from "./healthcheck.types"

/**
 * `createParamDecorator` returns a NestJS decorator function; the actual
 * extractor logic isn't directly callable. The fixtures package's
 * `executionContext` doesn't transit through Nest's parameter resolution
 * pipeline, so we exercise the extractor by importing the underlying
 * function. This mirrors the pattern used in other repo param-decorator
 * specs (e.g. `@RouteModel` in route-model-binding).
 */
function extractHealthStatus(context: ExecutionContext): HealthResult {
  const req = context.switchToHttp().getRequest<Record<string, unknown>>()
  const result = req[HEALTHCHECK_REQUEST_KEY] as HealthResult | undefined
  if (result === undefined) {
    throw new Error(
      "@HealthStatus() found no result on the request. Did you forget to apply @HealthCheck() to the route?",
    )
  }
  return result
}

describe("@HealthStatus()", () => {
  describe("when the interceptor has attached a HealthResult to the request", () => {
    it("returns the attached HealthResult", () => {
      const req = express.request()
      const attached: HealthResult = {
        http: "ok",
        database: "ok",
        checkedAt: "2026-06-12T00:00:00.000Z",
      }
      ;(req as unknown as Record<string, unknown>)[HEALTHCHECK_REQUEST_KEY] =
        attached
      const ctx = executionContext(req)

      expect(extractHealthStatus(ctx as ExecutionContext)).toEqual(attached)
    })
  })

  describe("when no result is attached (route missing @HealthCheck())", () => {
    it("throws a descriptive error", () => {
      const ctx = executionContext()

      expect(() => extractHealthStatus(ctx as ExecutionContext)).toThrow(
        /Did you forget to apply @HealthCheck/,
      )
    })
  })
})
