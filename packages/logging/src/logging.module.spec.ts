import { faker } from "@faker-js/faker"
import {
  ApplicationLogger,
  getLoggerToken,
  type Logger,
  LoggingModule,
} from "@neomaventures/logging"
import { Test } from "@nestjs/testing"
import { ArrayStream, LogLevelNumber } from "fixtures/logging"

describe("LoggingModule", () => {
  describe("forRoot + forFeature — split precedence", () => {
    describe("Given forRoot({ defaultLevel: 'debug' }) + forFeature([{ namespace }])", () => {
      const namespace = `neomaventures:${faker.lorem.word()}`

      it("should emit ApplicationLogger at debug and namespaced logger at error (floor)", async () => {
        const logs: any[] = []
        const module = await Test.createTestingModule({
          imports: [
            LoggingModule.forRoot({
              destination: new ArrayStream(logs),
              defaultLevel: "debug",
            }),
            LoggingModule.forFeature([{ namespace }]),
          ],
        }).compile()

        const app = module.get(ApplicationLogger)
        const ns = module.get<Logger>(getLoggerToken(namespace))

        app.debug("app-debug")
        app.info("app-info")
        ns.debug("ns-debug")
        ns.warn("ns-warn")
        ns.error("ns-error")

        const levels = logs.map((l: any) => ({ level: l.level, ns: l.ns }))
        expect(levels).toEqual([
          { level: LogLevelNumber.debug, ns: undefined },
          { level: LogLevelNumber.info, ns: undefined },
          { level: LogLevelNumber.error, ns: namespace },
        ])
      })

      it("regression: defaultLevel='debug' must NOT raise namespaced loggers", async () => {
        const logs: any[] = []
        const module = await Test.createTestingModule({
          imports: [
            LoggingModule.forRoot({
              destination: new ArrayStream(logs),
              defaultLevel: "debug",
            }),
            LoggingModule.forFeature([{ namespace }]),
          ],
        }).compile()

        const ns = module.get<Logger>(getLoggerToken(namespace))

        ns.debug("ns-debug")

        expect(logs).toHaveLength(0)
      })
    })

    describe("Given forRoot({ loggers: [{ ns, level: 'trace' }] }) + forFeature([{ ns }])", () => {
      const namespace = `neomaventures:${faker.lorem.word()}`

      it("should emit namespaced at trace and ApplicationLogger at info", async () => {
        const logs: any[] = []
        const module = await Test.createTestingModule({
          imports: [
            LoggingModule.forRoot({
              destination: new ArrayStream(logs),
              loggers: [{ namespace, level: "trace" }],
            }),
            LoggingModule.forFeature([{ namespace }]),
          ],
        }).compile()

        const app = module.get(ApplicationLogger)
        const ns = module.get<Logger>(getLoggerToken(namespace))

        app.debug("app-debug")
        app.info("app-info")
        ns.trace("ns-trace")
        ns.debug("ns-debug")

        expect(logs).toEqual([
          expect.objectContaining({ level: LogLevelNumber.info }),
          expect.objectContaining({
            level: LogLevelNumber.trace,
            ns: namespace,
          }),
          expect.objectContaining({
            level: LogLevelNumber.debug,
            ns: namespace,
          }),
        ])
      })
    })

    describe("Given forRoot() + forFeature([{ ns, level: 'debug' }])", () => {
      const namespace = `neomaventures:${faker.lorem.word()}`

      it("should apply the package default level", async () => {
        const logs: any[] = []
        const module = await Test.createTestingModule({
          imports: [
            LoggingModule.forRoot({ destination: new ArrayStream(logs) }),
            LoggingModule.forFeature([{ namespace, level: "debug" }]),
          ],
        }).compile()

        const ns = module.get<Logger>(getLoggerToken(namespace))

        ns.debug("ns-debug")
        ns.info("ns-info")

        expect(logs).toEqual([
          expect.objectContaining({
            level: LogLevelNumber.debug,
            ns: namespace,
          }),
          expect.objectContaining({
            level: LogLevelNumber.info,
            ns: namespace,
          }),
        ])
      })
    })

    describe("Given forFeature called with the string shorthand", () => {
      const namespace = `neomaventures:${faker.lorem.word()}`

      it("should register a namespaced logger that floors at error", async () => {
        const logs: any[] = []
        const module = await Test.createTestingModule({
          imports: [
            LoggingModule.forRoot({ destination: new ArrayStream(logs) }),
            LoggingModule.forFeature([namespace]),
          ],
        }).compile()

        const ns = module.get<Logger>(getLoggerToken(namespace))

        ns.warn("ns-warn")
        ns.error("ns-error")

        expect(logs).toEqual([
          expect.objectContaining({
            level: LogLevelNumber.error,
            ns: namespace,
          }),
        ])
      })
    })
  })

  describe("forRootAsync + forFeature — mirrors sync precedence", () => {
    const namespace = `neomaventures:${faker.lorem.word()}`

    it("should resolve namespaced level from loggers override under async registration", async () => {
      const logs: any[] = []
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

    it("regression: defaultLevel under forRootAsync does not raise namespaced loggers", async () => {
      const logs: any[] = []
      const module = await Test.createTestingModule({
        imports: [
          LoggingModule.forRootAsync({
            useFactory: () => ({
              destination: new ArrayStream(logs),
              defaultLevel: "debug",
            }),
          }),
          LoggingModule.forFeature([{ namespace }]),
        ],
      }).compile()

      const ns = module.get<Logger>(getLoggerToken(namespace))

      ns.debug("ns-debug")

      expect(logs).toHaveLength(0)
    })
  })
})
