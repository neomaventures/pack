import { MockLoggerService } from "@neomaventures/fixtures"
import { type HealthResult } from "@neomaventures/healthcheck"
import { ApplicationLoggerService } from "@neomaventures/logging"
import {
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"

import { ApplicationController } from "./application.controller"

describe("ApplicationController", () => {
  let controller: ApplicationController
  let logger: MockLoggerService

  beforeEach(async () => {
    logger = new MockLoggerService()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationController],
      providers: [{ provide: ApplicationLoggerService, useValue: logger }],
    }).compile()

    controller = module.get<ApplicationController>(ApplicationController)
  })

  describe("index()", () => {
    it("should log that the welcome page was requested", () => {
      controller.index()

      expect(logger.log).toHaveBeenCalledWith("Welcome page requested")
    })
  })

  describe("error()", () => {
    describe("Given type is 'redirect'", () => {
      it("should throw a BadRequestException", () => {
        expect(() => controller.error("redirect")).toThrow(BadRequestException)
      })
    })

    describe("Given type is 'render'", () => {
      it("should throw an InternalServerErrorException", () => {
        expect(() => controller.error("render")).toThrow(
          InternalServerErrorException,
        )
      })
    })

    describe("Given type is unknown", () => {
      it("should throw a BadRequestException", () => {
        expect(() => controller.error("invalid")).toThrow(BadRequestException)
      })
    })

    describe("Given type is not provided", () => {
      it("should throw a BadRequestException", () => {
        expect(() => controller.error()).toThrow(BadRequestException)
      })
    })
  })

  describe("apiHealth()", () => {
    it("should pass the HealthStatus argument straight through", () => {
      const status: HealthResult = {
        http: "ok",
        database: "ok",
        checkedAt: "2026-06-12T12:00:00.000Z",
      }

      expect(controller.apiHealth(status)).toBe(status)
    })
  })

  describe("health()", () => {
    it("should wrap the HealthStatus argument as { result } for the render context", () => {
      const status: HealthResult = {
        http: "ok",
        database: "ok",
        checkedAt: "2026-06-12T12:00:00.000Z",
      }

      expect(controller.health(status)).toEqual({ result: status })
    })
  })
})
