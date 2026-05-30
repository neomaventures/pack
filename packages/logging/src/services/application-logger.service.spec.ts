import { faker } from "@faker-js/faker"
import { express } from "@neoma/fixtures"
import {
  ApplicationLoggerService,
  LOGGING_MODULE_OPTIONS,
  type LoggingConfiguration,
  LoggingModule,
} from "@neoma/logging"
import { getRequest } from "@neoma/request-context"
import { Test, type TestingModule } from "@nestjs/testing"
import { type Request } from "express"
import { LogLevelNumber, LogMethodTests, ArrayStream } from "fixtures/logging"

jest.mock("@neoma/request-context", () => ({
  getRequest: jest.fn(),
}))

const mockedGetRequest = jest.mocked(getRequest)

describe("ApplicationLoggerService", () => {
  const message = faker.hacker.phrase()
  const context = { ctx: faker.lorem.word() }

  let service: ApplicationLoggerService
  let logOptions: LoggingConfiguration

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggingModule.forRoot()],
    })
      .overrideProvider(LOGGING_MODULE_OPTIONS)
      .useValue({ logDestination: new ArrayStream(), logLevel: "verbose" })
      .compile()

    service = module.get(ApplicationLoggerService)
    logOptions = module.get(LOGGING_MODULE_OPTIONS)

    mockedGetRequest.mockReturnValue(undefined)
  })

  afterEach(() => {
    mockedGetRequest.mockReset()
  })

  describe("Default Configuration", () => {
    it("It should default to 'log' level when using forRoot() with no options", async () => {
      const logs: any[] = []
      const module: TestingModule = await Test.createTestingModule({
        imports: [LoggingModule.forRoot()],
      })
        .overrideProvider(LOGGING_MODULE_OPTIONS)
        .useValue({ logDestination: new ArrayStream(logs) })
        .compile()

      const service = module.get(ApplicationLoggerService)

      service.verbose(message)
      service.debug(message)
      service.log(message)
      service.warn(message)
      service.error(message)
      service.fatal(message)

      expect(logs).toHaveLength(4)
      expect(logs[0]).toMatchObject({ level: LogLevelNumber.log, msg: message })
      expect(logs[1]).toMatchObject({
        level: LogLevelNumber.warn,
        msg: message,
      })
      expect(logs[2]).toMatchObject({
        level: LogLevelNumber.error,
        msg: message,
      })
      expect(logs[3]).toMatchObject({
        level: LogLevelNumber.fatal,
        msg: message,
      })
    })

    it("It should default to 'log' level when using forRoot() with no logLevel", async () => {
      const logs: any[] = []
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({ logDestination: new ArrayStream(logs) }),
        ],
      }).compile()

      const service = module.get(ApplicationLoggerService)

      service.verbose(message)
      service.debug(message)
      service.log(message)
      service.warn(message)
      service.error(message)
      service.fatal(message)

      expect(logs).toHaveLength(4)
      expect(logs[0]).toMatchObject({ level: LogLevelNumber.log, msg: message })
      expect(logs[1]).toMatchObject({
        level: LogLevelNumber.warn,
        msg: message,
      })
      expect(logs[2]).toMatchObject({
        level: LogLevelNumber.error,
        msg: message,
      })
      expect(logs[3]).toMatchObject({
        level: LogLevelNumber.fatal,
        msg: message,
      })
    })
  })

  describe("Logging Methods", () => {
    LogMethodTests.forEach(({ method, level }) => {
      describe(method, () => {
        describe("When it's called outside a request context", () => {
          describe("When it's called with just a message", () => {
            it(`It should log the message at the ${method} level`, () => {
              service[method](message)
              expect(logOptions.logDestination.logs).toContainEqual(
                expect.objectContaining({ level, msg: message }),
              )
            })
          })

          describe("When it's called with a context object", () => {
            it(`It should log the message and merge the context's properties into the log entry at the ${method} level`, () => {
              service[method](message, context)
              expect(logOptions.logDestination.logs).toContainEqual(
                expect.objectContaining({ level, msg: message, ...context }),
              )
            })
          })
        })

        describe("When it's called inside a request context", () => {
          const request = express.request()
          beforeEach(() => {
            mockedGetRequest.mockReturnValue(request as unknown as Request)
          })

          describe("When it's called with just a message", () => {
            it(`It should log the message and the request at the ${method} level`, () => {
              service[method](message)
              expect(logOptions.logDestination.logs).toContainEqual(
                expect.objectContaining({
                  level,
                  msg: message,
                  req: expect.objectContaining({
                    method: request.method,
                    url: request.url,
                  }),
                }),
              )
            })
          })

          describe("When it's called with a context object", () => {
            it(`It should log the message, merge the context, and include the request at the ${method} level`, () => {
              service[method](message, context)
              expect(logOptions.logDestination.logs).toContainEqual(
                expect.objectContaining({
                  level,
                  msg: message,
                  req: expect.objectContaining({
                    method: request.method,
                    url: request.url,
                  }),
                  ...context,
                }),
              )
            })
          })
        })
      })
    })

    describe("info() is an alias for log()", () => {
      it("It should log at the log (info) level", () => {
        service.info(message, context)
        expect(logOptions.logDestination.logs).toContainEqual(
          expect.objectContaining({
            level: LogLevelNumber.log,
            msg: message,
            ...context,
          }),
        )
      })
    })

    describe("When called with an err in the context", () => {
      it("It should let pino serialize Error fields as { type, message, stack }", () => {
        const err = new Error(faker.hacker.phrase())

        service.error(message, { err })

        expect(logOptions.logDestination.logs).toContainEqual(
          expect.objectContaining({
            level: LogLevelNumber.error,
            msg: message,
            err: expect.objectContaining({
              type: "Error",
              message: err.message,
              stack: expect.any(String),
            }),
          }),
        )
      })

      it("It should preserve other fields alongside the serialized err", () => {
        const err = new Error(faker.hacker.phrase())
        const extra = { chargeId: faker.string.uuid() }

        service.error(message, { err, ...extra })

        expect(logOptions.logDestination.logs).toContainEqual(
          expect.objectContaining({
            level: LogLevelNumber.error,
            msg: message,
            chargeId: extra.chargeId,
            err: expect.objectContaining({ message: err.message }),
          }),
        )
      })
    })
  })

  describe("Static delegates", () => {
    it("It should route ApplicationLoggerService.log(...) through the constructed instance", () => {
      ApplicationLoggerService.log(message, context)
      expect(logOptions.logDestination.logs).toContainEqual(
        expect.objectContaining({
          level: LogLevelNumber.log,
          msg: message,
          ...context,
        }),
      )
    })

    it("It should route ApplicationLoggerService.error(...) through the constructed instance", () => {
      const err = new Error(faker.hacker.phrase())
      ApplicationLoggerService.error(message, { err })
      expect(logOptions.logDestination.logs).toContainEqual(
        expect.objectContaining({
          level: LogLevelNumber.error,
          msg: message,
          err: expect.objectContaining({ message: err.message }),
        }),
      )
    })

    it("It should include the request when the static delegate is called inside a request context", () => {
      const request = express.request()
      mockedGetRequest.mockReturnValue(request as unknown as Request)

      ApplicationLoggerService.warn(message)

      expect(logOptions.logDestination.logs).toContainEqual(
        expect.objectContaining({
          level: LogLevelNumber.warn,
          msg: message,
          req: expect.objectContaining({
            method: request.method,
            url: request.url,
          }),
        }),
      )
    })
  })

  describe("Log Level Filtering", () => {
    it("It should log at 'verbose' level and above when logLevel is 'verbose'", async () => {
      const logs: any[] = []
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            logDestination: new ArrayStream(logs),
            logLevel: "verbose",
          }),
        ],
      }).compile()

      const service = module.get(ApplicationLoggerService)

      service.verbose(message)
      service.debug(message)
      service.log(message)
      service.warn(message)
      service.error(message)
      service.fatal(message)

      expect(logs).toHaveLength(6)
      expect(logs.map((l: any) => l.level)).toEqual([
        LogLevelNumber.verbose,
        LogLevelNumber.debug,
        LogLevelNumber.log,
        LogLevelNumber.warn,
        LogLevelNumber.error,
        LogLevelNumber.fatal,
      ])
    })

    it("It should log at 'debug' level and above when logLevel is 'debug'", async () => {
      const logs: any[] = []
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            logDestination: new ArrayStream(logs),
            logLevel: "debug",
          }),
        ],
      }).compile()

      const service = module.get(ApplicationLoggerService)

      service.verbose(message)
      service.debug(message)
      service.log(message)
      service.warn(message)
      service.error(message)
      service.fatal(message)

      expect(logs).toHaveLength(5)
      expect(logs.map((l: any) => l.level)).toEqual([
        LogLevelNumber.debug,
        LogLevelNumber.log,
        LogLevelNumber.warn,
        LogLevelNumber.error,
        LogLevelNumber.fatal,
      ])
    })

    it("It should log at 'log' level and above when logLevel is 'log'", async () => {
      const logs: any[] = []
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            logDestination: new ArrayStream(logs),
            logLevel: "log",
          }),
        ],
      }).compile()

      const service = module.get(ApplicationLoggerService)

      service.verbose(message)
      service.debug(message)
      service.log(message)
      service.warn(message)
      service.error(message)
      service.fatal(message)

      expect(logs).toHaveLength(4)
      expect(logs.map((l: any) => l.level)).toEqual([
        LogLevelNumber.log,
        LogLevelNumber.warn,
        LogLevelNumber.error,
        LogLevelNumber.fatal,
      ])
    })

    it("It should log at 'warn' level and above when logLevel is 'warn'", async () => {
      const logs: any[] = []
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            logDestination: new ArrayStream(logs),
            logLevel: "warn",
          }),
        ],
      }).compile()

      const service = module.get(ApplicationLoggerService)

      service.verbose(message)
      service.debug(message)
      service.log(message)
      service.warn(message)
      service.error(message)
      service.fatal(message)

      expect(logs).toHaveLength(3)
      expect(logs.map((l: any) => l.level)).toEqual([
        LogLevelNumber.warn,
        LogLevelNumber.error,
        LogLevelNumber.fatal,
      ])
    })

    it("It should log at 'error' level and above when logLevel is 'error'", async () => {
      const logs: any[] = []
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            logDestination: new ArrayStream(logs),
            logLevel: "error",
          }),
        ],
      }).compile()

      const service = module.get(ApplicationLoggerService)

      service.verbose(message)
      service.debug(message)
      service.log(message)
      service.warn(message)
      service.error(message)
      service.fatal(message)

      expect(logs).toHaveLength(2)
      expect(logs.map((l: any) => l.level)).toEqual([
        LogLevelNumber.error,
        LogLevelNumber.fatal,
      ])
    })

    it("It should log at 'fatal' level and above when logLevel is 'fatal'", async () => {
      const logs: any[] = []
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            logDestination: new ArrayStream(logs),
            logLevel: "fatal",
          }),
        ],
      }).compile()

      const service = module.get(ApplicationLoggerService)

      service.verbose(message)
      service.debug(message)
      service.log(message)
      service.warn(message)
      service.error(message)
      service.fatal(message)

      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        level: LogLevelNumber.fatal,
        msg: message,
      })
    })
  })

  describe("Log Context Configuration", () => {
    const logs: any[] = []
    const message = faker.hacker.phrase()
    const logContext = {
      service: "test-service",
      version: "1.0.0",
      environment: "test",
    }

    let service: ApplicationLoggerService
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            logDestination: new ArrayStream(logs),
            logLevel: "verbose",
            logContext: logContext,
          }),
        ],
      }).compile()

      service = module.get(ApplicationLoggerService)
    })

    LogMethodTests.forEach(({ method, level }) => {
      describe(method, () => {
        it(`It should include the configured logContext when logging a bare message at ${method} level`, () => {
          service[method](message)

          expect(logs).toContainEqual(
            expect.objectContaining({
              level,
              msg: message,
              ...logContext,
            }),
          )
        })

        it(`It should merge call-time context alongside the configured logContext at ${method} level`, () => {
          const contextParam = { userId: "user123", action: "login" }

          service[method](message, contextParam)

          expect(logs).toContainEqual(
            expect.objectContaining({
              level,
              msg: message,
              ...logContext,
              ...contextParam,
            }),
          )
        })
      })
    })
  })

  describe("Redaction", () => {
    const REDACTED_VALUE = "[REDACTED]"
    const REDACTED_PATHS = [
      "password",
      "*.password",
      "job.salary",
      "tokens.*.secretKey",
      "medicalRecords.*",
    ]

    describe(`Given redaction is configured for the fields ${REDACTED_PATHS.join(", ")}`, () => {
      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          imports: [
            LoggingModule.forRoot({
              logDestination: new ArrayStream(),
              logRedact: REDACTED_PATHS,
            }),
          ],
        }).compile()

        service = module.get(ApplicationLoggerService)
        logOptions = module.get(LOGGING_MODULE_OPTIONS)
      })

      it("It should redact the top level password field from any logs (password)", () => {
        const message = faker.hacker.phrase()
        const event = {
          username: faker.internet.username(),
          password: faker.internet.password(),
          email: faker.internet.email(),
        }

        service.log(message, event)

        expect(logOptions.logDestination.logs).toContainEqual(
          expect.objectContaining({
            username: event.username,
            email: event.email,
            password: REDACTED_VALUE,
          }),
        )
      })

      it("It should redact the password property from any single level nested objects (*.password)", () => {
        const message = faker.hacker.phrase()
        const event = {
          username: faker.internet.username(),
          googleCredentials: {
            password: faker.internet.password(),
            email: faker.internet.email(),
          },
          awsCredentials: {
            password: faker.internet.password(),
            email: faker.internet.email(),
          },
        }

        service.log(message, event)

        expect(logOptions.logDestination.logs).toContainEqual(
          expect.objectContaining({
            username: event.username,
            googleCredentials: {
              email: event.googleCredentials.email,
              password: REDACTED_VALUE,
            },
            awsCredentials: {
              email: event.awsCredentials.email,
              password: REDACTED_VALUE,
            },
          }),
        )
      })

      it("It should redact the nested salary property from a job object (job.salary)", () => {
        const message = faker.hacker.phrase()
        const event = {
          name: faker.person.fullName(),
          job: {
            title: faker.person.jobTitle(),
            salary: faker.number.float({ min: 50000, max: 200000 }),
          },
        }

        service.log(message, event)

        expect(logOptions.logDestination.logs).toContainEqual(
          expect.objectContaining({
            name: event.name,
            job: {
              title: event.job.title,
              salary: REDACTED_VALUE,
            },
          }),
        )
      })

      it("It should redact the nested secretKey property from any object under tokens (tokens.*.secretKey)", () => {
        const message = faker.hacker.phrase()
        const event = {
          username: faker.internet.username(),
          tokens: {
            github: {
              secretKey: faker.internet.password(),
              expires: faker.date.future().toString(),
            },
            aws: {
              secretKey: faker.internet.password(),
              region: faker.location.country(),
            },
          },
        }

        service.log(message, event)

        expect(logOptions.logDestination.logs).toContainEqual(
          expect.objectContaining({
            username: event.username,
            tokens: {
              github: {
                expires: event.tokens.github.expires,
                secretKey: REDACTED_VALUE,
              },
              aws: {
                region: event.tokens.aws.region,
                secretKey: REDACTED_VALUE,
              },
            },
          }),
        )
      })

      it("It should redact the nested secretKey property from any array objects under tokens (tokens.*.secretKey)", () => {
        const message = faker.hacker.phrase()
        const event = {
          username: faker.internet.username(),
          tokens: [
            {
              secretKey: faker.internet.password(),
              expires: faker.date.future().toString(),
            },
            {
              secretKey: faker.internet.password(),
              region: faker.location.country(),
            },
          ],
        }

        service.log(message, event)

        expect(logOptions.logDestination.logs).toContainEqual(
          expect.objectContaining({
            username: event.username,
            tokens: [
              {
                expires: event.tokens[0].expires,
                secretKey: REDACTED_VALUE,
              },
              {
                region: event.tokens[1].region,
                secretKey: REDACTED_VALUE,
              },
            ],
          }),
        )
      })

      it("It should redact all nested properties within the top level medicalRecords (medicalRecords.*)", () => {
        const message = faker.hacker.phrase()
        const event = {
          name: faker.person.fullName(),
          medicalRecords: {
            bloodType: "O+",
            allergies: ["peanuts"],
            conditions: ["diabetes"],
            medications: ["insulin"],
          },
        }

        service.log(message, event)

        expect(logOptions.logDestination.logs).toContainEqual(
          expect.objectContaining({
            name: event.name,
            medicalRecords: {
              bloodType: REDACTED_VALUE,
              allergies: REDACTED_VALUE,
              conditions: REDACTED_VALUE,
              medications: REDACTED_VALUE,
            },
          }),
        )
      })
    })
  })
})
