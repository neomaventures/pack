import { faker } from "@faker-js/faker"
import {
  ApplicationLogger,
  InjectLogger,
  type Logger,
  LoggingModule,
} from "@neomaventures/logging"
import { Injectable } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { ArrayStream, LogLevelNumber } from "fixtures/logging"

describe("@InjectLogger", () => {
  describe("Given the parameterless form @InjectLogger()", () => {
    @Injectable()
    class SUT {
      public constructor(
        @InjectLogger() public readonly logger: ApplicationLogger,
      ) {}
    }

    it("should inject the ApplicationLogger", async () => {
      const module = await Test.createTestingModule({
        imports: [LoggingModule.forRoot()],
        providers: [SUT],
      }).compile()

      const sut = module.get(SUT)
      expect(sut.logger).toBeInstanceOf(ApplicationLogger)
    })
  })

  describe("Given the namespaced form @InjectLogger(ns)", () => {
    const namespace = `neomaventures:${faker.lorem.word()}`

    @Injectable()
    class SUT {
      public constructor(
        @InjectLogger(namespace) public readonly logger: Logger,
      ) {}
    }

    it("should inject the forFeature-registered Logger", async () => {
      const logs: any[] = []
      const module = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            destination: new ArrayStream(logs),
            loggers: [{ namespace, level: "info" }],
          }),
          LoggingModule.forFeature([{ namespace }]),
        ],
        providers: [SUT],
      }).compile()

      const sut = module.get(SUT)
      sut.logger.info(faker.hacker.phrase())

      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        ns: namespace,
        level: LogLevelNumber.info,
      })
    })
  })
})
