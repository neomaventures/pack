import { faker } from "@faker-js/faker"
import { type HealthResult } from "@neomaventures/healthcheck"
import { ApplicationLogger } from "@neomaventures/logging"
import { MockLogger } from "@neomaventures/logging/testing"
import {
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"

import { ApplicationController } from "./application.controller"

describe("ApplicationController", () => {
  let controller: ApplicationController
  let logger: MockLogger

  beforeEach(async () => {
    logger = new MockLogger()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationController],
      providers: [{ provide: ApplicationLogger, useValue: logger }],
    }).compile()

    controller = module.get<ApplicationController>(ApplicationController)
  })

  describe("index()", () => {
    it("should log that the welcome page was requested", () => {
      controller.index()

      expect(logger.info).toHaveBeenCalledWith("Welcome page requested")
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
        checkedAt: faker.date.recent(),
      }

      expect(controller.apiHealth(status)).toBe(status)
    })
  })

  describe("health()", () => {
    it("should wrap the HealthStatus argument as { result } for the render context", () => {
      const status: HealthResult = {
        http: "ok",
        database: "ok",
        checkedAt: faker.date.recent(),
      }

      expect(controller.health(status)).toEqual({ result: status })
    })
  })
})
