import { Reflector } from "@nestjs/core"

import { HEALTHCHECK_METADATA_KEY } from "./healthcheck.constants"
import { HealthCheck } from "./healthcheck.decorator"

describe("@HealthCheck()", () => {
  const reflector = new Reflector()

  describe("Given a class method decorated with @HealthCheck()", () => {
    class DecoratedController {
      @HealthCheck()
      public health(): void {}
    }

    it("should set the healthcheck metadata flag to true", () => {
      const value = reflector.get<boolean>(
        HEALTHCHECK_METADATA_KEY,
        DecoratedController.prototype.health,
      )

      expect(value).toBe(true)
    })
  })

  describe("Given an undecorated method", () => {
    class UndecoratedController {
      public ping(): void {}
    }

    it("should not set the healthcheck metadata flag", () => {
      const value = reflector.get<boolean>(
        HEALTHCHECK_METADATA_KEY,
        UndecoratedController.prototype.ping,
      )

      expect(value).toBeUndefined()
    })
  })
})
