import { MockLoggerService } from "@neomaventures/fixtures"
import { type HealthResult, HealthService } from "@neomaventures/healthcheck"
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
  let healthService: { check: jest.Mock }

  beforeEach(async () => {
    logger = new MockLoggerService()
    healthService = { check: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationController],
      providers: [
        { provide: ApplicationLoggerService, useValue: logger },
        { provide: HealthService, useValue: healthService },
      ],
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

  describe("status()", () => {
    it("should return the health probe result and an ISO timestamp", async () => {
      const checkResult: HealthResult = { http: "ok", database: "ok" }
      healthService.check.mockResolvedValue(checkResult)
      jest.useFakeTimers().setSystemTime(new Date("2026-06-11T12:34:56.789Z"))

      const result = await controller.status()

      expect(result).toEqual({
        result: checkResult,
        checkedAt: "2026-06-11T12:34:56.789Z",
      })

      jest.useRealTimers()
    })
  })
})
