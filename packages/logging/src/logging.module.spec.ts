import { faker } from "@faker-js/faker"
import { Injectable, Module } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { ArrayStream, LogLevelNumber } from "fixtures/logging"

import {
  ApplicationLogger,
  InjectLogger,
  type Logger,
  LoggingModule,
} from "@neomaventures/logging"

import { getLoggerToken } from "./tokens"

describe("LoggingModule", () => {
  describe("forRootAsync", () => {
    describe("Given useFactory resolves options", () => {
      it("should wire ApplicationLogger and forFeature loggers identically to forRoot", async () => {
        const logs: any[] = []
        const namespace = `neomaventures:${faker.lorem.word()}`
        const module = await Test.createTestingModule({
          imports: [
            LoggingModule.forRootAsync({
              useFactory: () => ({
                destination: new ArrayStream(logs),
                loggers: [{ namespace, level: "debug" }],
              }),
            }),
            LoggingModule.forFeature([{ namespace }]),
          ],
        }).compile()

        const ns = module.get<Logger>(getLoggerToken(namespace))

        ns.debug("ns-debug")

        expect(logs).toEqual([
          expect.objectContaining({
            level: LogLevelNumber.debug,
            ns: namespace,
          }),
        ])
      })
    })
  })

  describe("forFeature(string[])", () => {
    describe("Given a namespace passed as a bare string", () => {
      it("should register a logger equivalent to { namespace: string }", async () => {
        const logs: any[] = []
        const namespace = `neomaventures:${faker.lorem.word()}`

        const stringModule = await Test.createTestingModule({
          imports: [
            LoggingModule.forRoot({
              destination: new ArrayStream(logs),
              loggers: [{ namespace, level: "debug" }],
            }),
            LoggingModule.forFeature([namespace]),
          ],
        }).compile()

        const objectModule = await Test.createTestingModule({
          imports: [
            LoggingModule.forRoot({
              destination: new ArrayStream([]),
              loggers: [{ namespace, level: "debug" }],
            }),
            LoggingModule.forFeature([{ namespace }]),
          ],
        }).compile()

        const fromString = stringModule.get<Logger>(getLoggerToken(namespace))
        const fromObject = objectModule.get<Logger>(getLoggerToken(namespace))

        expect(fromString).toBeDefined()
        expect(fromObject).toBeDefined()

        fromString.debug("shorthand")

        expect(logs).toEqual([
          expect.objectContaining({
            level: LogLevelNumber.debug,
            ns: namespace,
            msg: "shorthand",
          }),
        ])
      })
    })
  })

  describe("global registration", () => {
    describe("Given forRoot is imported in a parent module", () => {
      it("should expose ApplicationLogger to feature modules without an explicit import", async () => {
        @Injectable()
        class FeatureService {
          public constructor(
            @InjectLogger() public readonly logger: ApplicationLogger,
          ) {}
        }

        @Module({ providers: [FeatureService], exports: [FeatureService] })
        class FeatureModule {}

        const module = await Test.createTestingModule({
          imports: [LoggingModule.forRoot(), FeatureModule],
        }).compile()

        const feature = module.get(FeatureService)
        const provider = module.get(ApplicationLogger)

        expect(feature.logger).toBe(provider)
      })
    })
  })
})
