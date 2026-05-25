import {
  LoggingModule,
  ApplicationLoggerService,
  RequestLoggerService,
} from "@neoma/logging"
import { Inject, Injectable, Module } from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { ArrayStream } from "fixtures/logging"

@Injectable()
class TestService {
  public constructor(
    public logger: ApplicationLoggerService,
    @Inject(RequestLoggerService) public reqLogger: RequestLoggerService,
  ) {}
}

describe("LoggingModule", () => {
  describe("Plain LoggingModule import (no forRoot)", () => {
    it("It should NOT provide ApplicationLoggerService", async () => {
      await expect(
        Test.createTestingModule({
          imports: [LoggingModule],
          providers: [TestService],
        }).compile(),
      ).rejects.toThrow()
    })
  })

  describe("forRoot", () => {
    let m: TestingModule
    beforeEach(async () => {
      m = await Test.createTestingModule({
        imports: [LoggingModule.forRoot()],
        providers: [TestService],
      }).compile()
    })

    it("It should export ApplicationLoggerService", async () => {
      expect((await m.resolve(TestService)).logger).toBeInstanceOf(
        ApplicationLoggerService,
      )
    })

    it("It should export RequestLoggerService", async () => {
      expect((await m.resolve(TestService)).reqLogger).toBeInstanceOf(
        RequestLoggerService,
      )
    })

    it("It should make services available to child modules without importing LoggingModule", async () => {
      @Injectable()
      class ChildService {
        public constructor(public logger: ApplicationLoggerService) {}
      }

      @Module({ providers: [ChildService] })
      class ChildModule {}

      const m = await Test.createTestingModule({
        imports: [LoggingModule.forRoot(), ChildModule],
      }).compile()

      const childService = m.get(ChildService)
      expect(childService.logger).toBeInstanceOf(ApplicationLoggerService)
    })

    it("It should boot the application without error", async () => {
      const app = m.createNestApplication()
      await expect(app.init()).resolves.toBeDefined()
      await app.close()
    })
  })

  describe("forRootAsync", () => {
    it("It should provide the loggers and apply options resolved by the factory", async () => {
      const logs: any[] = []

      const m = await Test.createTestingModule({
        imports: [
          LoggingModule.forRootAsync({
            useFactory: () => ({
              logDestination: new ArrayStream(logs),
              logContext: { service: "async-api" },
            }),
          }),
        ],
        providers: [TestService],
      }).compile()

      const { logger, reqLogger } = await m.resolve(TestService)
      expect(logger).toBeInstanceOf(ApplicationLoggerService)
      expect(reqLogger).toBeInstanceOf(RequestLoggerService)

      logger.log("async boot")
      expect(logs[0]).toMatchObject({ msg: "async boot", service: "async-api" })
    })
  })
})
