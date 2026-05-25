import { faker } from "@faker-js/faker"
import {
  ApplicationLoggerService,
  LOGGING_MODULE_OPTIONS,
  type LoggingConfiguration,
  LoggingModule,
} from "@neoma/logging"
import { Test, type TestingModule } from "@nestjs/testing"
import { LogLevelNumber, LogMethodTests, ArrayStream } from "fixtures/logging"

const username = faker.internet.username()
const attempts = 3
const template = "User %s logged in with %d attempts"

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

      service.verbose!(message)
      service.debug!(message)
      service.log(message)
      service.warn(message)
      service.error(message)
      service.fatal!(message)

      expect(logs).toHaveLength(4)
      expect(logs[0]).toMatchObject({
        level: LogLevelNumber.log,
        msg: message,
      })
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

      service.verbose!(message)
      service.debug!(message)
      service.log(message)
      service.warn(message)
      service.error(message)
      service.fatal!(message)

      expect(logs).toHaveLength(4)
      expect(logs[0]).toMatchObject({
        level: LogLevelNumber.log,
        msg: message,
      })
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
        describe("When it's called with just a message", () => {
          it(`It should log the message at the ${method} level`, () => {
            service[method](message)
            expect(logOptions.logDestination.logs).toContainEqual(
              expect.objectContaining({
                level,
                msg: message,
              }),
            )
          })
        })

        describe("When it's called with a message and a single context parameter that is an object", () => {
          it(`It should log the message and merge the context's properties into the log entry at the ${method} level`, () => {
            service[method](message, context)
            expect(logOptions.logDestination.logs).toContainEqual(
              expect.objectContaining({
                level,
                msg: message,
                ...context,
              }),
            )
          })
        })

        describe("When it's called with a message and a single context parameter that is a primitive (e.g. string)", () => {
          it(`It should interpolate the message with the primitive parameter at the ${method} level`, () => {
            service[method]("User %s logged in", username)
            expect(logOptions.logDestination.logs).toContainEqual(
              expect.objectContaining({
                level,
                msg: `User ${username} logged in`,
              }),
            )
          })
        })

        describe("When it's called with printf-style interpolation", () => {
          it(`It should interpolate the message with the provided parameters at the ${method} level`, () => {
            service[method](template, username, attempts)
            expect(logOptions.logDestination.logs).toContainEqual(
              expect.objectContaining({
                level,
                msg: `User ${username} logged in with 3 attempts`,
              }),
            )
          })
        })
      })
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

      service.verbose!(message)
      service.debug!(message)
      service.log(message)
      service.warn(message)
      service.error(message)
      service.fatal!(message)

      expect(logs).toHaveLength(6)
      expect(logs[0]).toMatchObject({
        level: LogLevelNumber.verbose,
        msg: message,
      })
      expect(logs[1]).toMatchObject({
        level: LogLevelNumber.debug,
        msg: message,
      })
      expect(logs[2]).toMatchObject({
        level: LogLevelNumber.log,
        msg: message,
      })
      expect(logs[3]).toMatchObject({
        level: LogLevelNumber.warn,
        msg: message,
      })
      expect(logs[4]).toMatchObject({
        level: LogLevelNumber.error,
        msg: message,
      })
      expect(logs[5]).toMatchObject({
        level: LogLevelNumber.fatal,
        msg: message,
      })
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

      service.verbose!(message)
      service.debug!(message)
      service.log(message)
      service.warn(message)
      service.error(message)
      service.fatal!(message)

      expect(logs).toHaveLength(5)
      expect(logs[0]).toMatchObject({
        level: LogLevelNumber.debug,
        msg: message,
      })
      expect(logs[1]).toMatchObject({
        level: LogLevelNumber.log,
        msg: message,
      })
      expect(logs[2]).toMatchObject({
        level: LogLevelNumber.warn,
        msg: message,
      })
      expect(logs[3]).toMatchObject({
        level: LogLevelNumber.error,
        msg: message,
      })
      expect(logs[4]).toMatchObject({
        level: LogLevelNumber.fatal,
        msg: message,
      })
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

      service.verbose!(message)
      service.debug!(message)
      service.log(message)
      service.warn(message)
      service.error(message)
      service.fatal!(message)

      expect(logs).toHaveLength(4)
      expect(logs[0]).toMatchObject({
        level: LogLevelNumber.log,
        msg: message,
      })
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

      service.verbose!(message)
      service.debug!(message)
      service.log(message)
      service.warn(message)
      service.error(message)
      service.fatal!(message)

      expect(logs).toHaveLength(3)
      expect(logs[0]).toMatchObject({
        level: LogLevelNumber.warn,
        msg: message,
      })
      expect(logs[1]).toMatchObject({
        level: LogLevelNumber.error,
        msg: message,
      })
      expect(logs[2]).toMatchObject({
        level: LogLevelNumber.fatal,
        msg: message,
      })
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

      service.verbose!(message)
      service.debug!(message)
      service.log(message)
      service.warn(message)
      service.error(message)
      service.fatal!(message)

      expect(logs).toHaveLength(2)
      expect(logs[0]).toMatchObject({
        level: LogLevelNumber.error,
        msg: message,
      })
      expect(logs[1]).toMatchObject({
        level: LogLevelNumber.fatal,
        msg: message,
      })
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

      service.verbose!(message)
      service.debug!(message)
      service.log(message)
      service.warn(message)
      service.error(message)
      service.fatal!(message)

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
        it(`It should include the log context when logging a simple message at ${method} level`, () => {
          service[method](message)

          expect(logs).toContainEqual(
            expect.objectContaining({
              level,
              msg: message,
              ...logContext,
            }),
          )
        })

        it(`It should include the log context when logging with object context parameter at ${method} level`, () => {
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

        it(`It should include the log context when using printf-style interpolation at ${method} level`, () => {
          service[method]("User %s performed %s", username, "login")

          expect(logs).toContainEqual(
            expect.objectContaining({
              level,
              msg: `User ${username} performed login`,
              ...logContext,
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
