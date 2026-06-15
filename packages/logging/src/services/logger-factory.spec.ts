import { faker } from "@faker-js/faker"
import { Test, type TestingModule } from "@nestjs/testing"
import { ArrayStream, LogLevelNumber } from "fixtures/logging"

import { type LoggingModuleOptions } from "../interfaces/logging-module-options.interface"
import { LOGGING_MODULE_OPTIONS } from "../symbols"

import { LoggerFactory } from "./logger-factory"

const build = async (options: LoggingModuleOptions): Promise<LoggerFactory> => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      LoggerFactory,
      { provide: LOGGING_MODULE_OPTIONS, useValue: options },
    ],
  }).compile()
  return module.get(LoggerFactory)
}

describe("LoggerFactory", () => {
  describe("create() — namespaced precedence", () => {
    describe("Given an app override and a package default", () => {
      it("should resolve to the app override level", async () => {
        const logs: any[] = []
        const namespace = `neomaventures:${faker.lorem.word()}`
        const factory = await build({
          destination: new ArrayStream(logs),
          loggers: [{ namespace, level: "debug" }],
        })

        const logger = factory.create({ namespace, level: "warn" })

        logger.debug(faker.hacker.phrase())

        expect(logs).toHaveLength(1)
        expect(logs[0]).toMatchObject({ level: LogLevelNumber.debug })
      })
    })

    describe("Given only a package default level", () => {
      it("should resolve to the package default", async () => {
        const logs: any[] = []
        const namespace = `neomaventures:${faker.lorem.word()}`
        const factory = await build({ destination: new ArrayStream(logs) })

        const logger = factory.create({ namespace, level: "warn" })

        logger.info(faker.hacker.phrase())
        logger.warn(faker.hacker.phrase())

        expect(logs).toHaveLength(1)
        expect(logs[0]).toMatchObject({ level: LogLevelNumber.warn })
      })
    })

    describe("Given no overrides and no package level", () => {
      it("should floor at error", async () => {
        const logs: any[] = []
        const namespace = `neomaventures:${faker.lorem.word()}`
        const factory = await build({ destination: new ArrayStream(logs) })

        const logger = factory.create({ namespace })

        logger.info(faker.hacker.phrase())
        logger.warn(faker.hacker.phrase())
        logger.error(faker.hacker.phrase())

        expect(logs).toHaveLength(1)
        expect(logs[0]).toMatchObject({ level: LogLevelNumber.error })
      })
    })

    describe("Given defaultLevel is set on the root", () => {
      it("should NOT leak defaultLevel into namespaced loggers (regression)", async () => {
        const logs: any[] = []
        const namespace = `neomaventures:${faker.lorem.word()}`
        const factory = await build({
          destination: new ArrayStream(logs),
          defaultLevel: "debug",
        })

        const logger = factory.create({ namespace })

        logger.debug(faker.hacker.phrase())
        logger.info(faker.hacker.phrase())
        logger.warn(faker.hacker.phrase())
        logger.error(faker.hacker.phrase())

        expect(logs).toHaveLength(1)
        expect(logs[0]).toMatchObject({ level: LogLevelNumber.error })
      })
    })

    describe("Given a namespace", () => {
      it("should stamp the namespace as `ns` on every entry", async () => {
        const logs: any[] = []
        const namespace = `neomaventures:${faker.lorem.word()}`
        const factory = await build({
          destination: new ArrayStream(logs),
          loggers: [{ namespace, level: "info" }],
        })

        const logger = factory.create({ namespace })

        logger.info(faker.hacker.phrase())

        expect(logs[0]).toMatchObject({ ns: namespace })
      })
    })
  })

  describe("createApplicationLogger() — ApplicationLogger precedence", () => {
    describe("Given defaultLevel is set", () => {
      it("should emit at defaultLevel", async () => {
        const logs: any[] = []
        const factory = await build({
          destination: new ArrayStream(logs),
          defaultLevel: "debug",
        })

        const logger = factory.createApplicationLogger()

        logger.debug(faker.hacker.phrase())

        expect(logs).toHaveLength(1)
        expect(logs[0]).toMatchObject({ level: LogLevelNumber.debug })
      })
    })

    describe("Given no defaultLevel", () => {
      it("should default to info", async () => {
        const logs: any[] = []
        const factory = await build({ destination: new ArrayStream(logs) })

        const logger = factory.createApplicationLogger()

        logger.debug(faker.hacker.phrase())
        logger.info(faker.hacker.phrase())

        expect(logs).toHaveLength(1)
        expect(logs[0]).toMatchObject({ level: LogLevelNumber.info })
      })
    })

    describe("Given defaultLevel='warn' and a loggers entry at 'trace'", () => {
      it("should emit at warn — loggers does not affect ApplicationLogger", async () => {
        const logs: any[] = []
        const factory = await build({
          destination: new ArrayStream(logs),
          defaultLevel: "warn",
          loggers: [{ namespace: "neomaventures:other", level: "trace" }],
        })

        const logger = factory.createApplicationLogger()

        logger.info(faker.hacker.phrase())
        logger.warn(faker.hacker.phrase())

        expect(logs).toHaveLength(1)
        expect(logs[0]).toMatchObject({ level: LogLevelNumber.warn })
      })
    })
  })
})
