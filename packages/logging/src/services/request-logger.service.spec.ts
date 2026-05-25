import { randomUUID } from "crypto"

import { faker } from "@faker-js/faker"
import { express } from "@neoma/fixtures"
import {
  LOGGING_MODULE_OPTIONS,
  type LoggingConfiguration,
  LoggingModule,
  RequestLoggerService,
} from "@neoma/logging"
import { REQUEST } from "@nestjs/core"
import { Test, type TestingModule } from "@nestjs/testing"
import { LogLevelNumber, LogMethodTests, ArrayStream } from "fixtures/logging"

const template = "User %s logged in with %d attempts"
const username = faker.internet.username()

describe("RequestLoggerService", () => {
  const message = faker.hacker.phrase()
  const context = { ctx: faker.lorem.word() }

  let service: RequestLoggerService
  let logOptions: LoggingConfiguration

  beforeEach(async () => {
    const mockRequest = express.request({
      method: "POST",
      url: "/api/users",
      headers: {
        "x-correlation-id": "test-123",
        "user-agent": "test-agent",
      },
      body: { username },
    })

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggingModule.forRoot({
          logDestination: new ArrayStream(),
          logLevel: "verbose",
        }),
      ],
    })
      .overrideProvider(REQUEST)
      .useValue(mockRequest)
      .compile()

    service = await module.resolve(RequestLoggerService)
    logOptions = module.get(LOGGING_MODULE_OPTIONS)
  })

  describe("Default Configuration", () => {
    it("It should default to 'log' level when using forRoot() with no options", async () => {
      const logs: any[] = []
      const mockRequest = express.request({
        method: "GET",
        url: "/health",
        headers: { "user-agent": "health-check" },
      })

      const module: TestingModule = await Test.createTestingModule({
        imports: [LoggingModule.forRoot()],
      })
        .overrideProvider(LOGGING_MODULE_OPTIONS)
        .useValue({ logDestination: new ArrayStream(logs) })
        .overrideProvider(REQUEST)
        .useValue(mockRequest)
        .compile()

      const service = await module.resolve(RequestLoggerService)

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
        req: expect.objectContaining({
          method: "GET",
          url: "/health",
        }),
      })
      expect(logs[1]).toMatchObject({
        level: LogLevelNumber.warn,
        msg: message,
        req: expect.objectContaining({
          method: "GET",
          url: "/health",
        }),
      })
      expect(logs[2]).toMatchObject({
        level: LogLevelNumber.error,
        msg: message,
        req: expect.objectContaining({
          method: "GET",
          url: "/health",
        }),
      })
      expect(logs[3]).toMatchObject({
        level: LogLevelNumber.fatal,
        msg: message,
        req: expect.objectContaining({
          method: "GET",
          url: "/health",
        }),
      })
    })

    it("It should default to 'log' level when using forRoot() with no logLevel", async () => {
      const logs: any[] = []
      const mockRequest = express.request({
        method: "POST",
        url: "/api/auth/login",
        headers: { "content-type": "application/json" },
      })

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({ logDestination: new ArrayStream(logs) }),
        ],
      })
        .overrideProvider(REQUEST)
        .useValue(mockRequest)
        .compile()

      const service = await module.resolve(RequestLoggerService)

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
        req: expect.objectContaining({
          method: "POST",
          url: "/api/auth/login",
        }),
      })
      expect(logs[1]).toMatchObject({
        level: LogLevelNumber.warn,
        msg: message,
        req: expect.objectContaining({
          method: "POST",
          url: "/api/auth/login",
        }),
      })
      expect(logs[2]).toMatchObject({
        level: LogLevelNumber.error,
        msg: message,
        req: expect.objectContaining({
          method: "POST",
          url: "/api/auth/login",
        }),
      })
      expect(logs[3]).toMatchObject({
        level: LogLevelNumber.fatal,
        msg: message,
        req: expect.objectContaining({
          method: "POST",
          url: "/api/auth/login",
        }),
      })
    })
  })

  describe("Logging Methods", () => {
    LogMethodTests.forEach(({ method, level }) => {
      describe(method, () => {
        describe("When it's called with just a message", () => {
          it(`It should log the message with request context at the ${method} level`, () => {
            service[method](message)
            expect(logOptions.logDestination.logs).toContainEqual(
              expect.objectContaining({
                level,
                msg: message,
                req: expect.objectContaining({
                  method: "POST",
                  url: "/api/users",
                }),
              }),
            )
          })
        })

        describe("When it's called with a message and a single context parameter that is an object", () => {
          it(`It should log the message and merge the context's properties with request context at the ${method} level`, () => {
            service[method](message, context)
            expect(logOptions.logDestination.logs).toContainEqual(
              expect.objectContaining({
                level,
                msg: message,
                ...context,
                req: expect.objectContaining({
                  method: "POST",
                  url: "/api/users",
                }),
              }),
            )
          })
        })

        describe("When it's called with a message and a single context parameter that is a primitive (e.g. string)", () => {
          it(`It should interpolate the message with the primitive parameter and include request context at the ${method} level`, () => {
            service[method]("User %s logged in", username)
            expect(logOptions.logDestination.logs).toContainEqual(
              expect.objectContaining({
                level,
                msg: `User ${username} logged in`,
                req: expect.objectContaining({
                  method: "POST",
                  url: "/api/users",
                }),
              }),
            )
          })
        })

        describe("When it's called with printf-style interpolation", () => {
          it(`It should interpolate the message with the provided parameters and include request context at the ${method} level`, () => {
            const attempts = 3

            service[method](template, username, attempts)
            expect(logOptions.logDestination.logs).toContainEqual(
              expect.objectContaining({
                level,
                msg: `User ${username} logged in with 3 attempts`,
                req: expect.objectContaining({
                  method: "POST",
                  url: "/api/users",
                }),
              }),
            )
          })
        })
      })
    })
  })

  describe("Log Context Configuration", () => {
    let logs: any[]
    let service: RequestLoggerService
    let mockRequest: any
    const logContext = {
      service: "test-service",
      version: "1.0.0",
      environment: "test",
    }

    beforeEach(async () => {
      logs = []
      mockRequest = express.request({
        method: "POST",
        url: "/api/context",
        headers: {
          "content-type": "application/json",
          "x-correlation-id": "test-123",
        },
        body: { operation: "context-test" },
      })

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            logDestination: new ArrayStream(logs),
            logLevel: "verbose",
            logContext: logContext,
          }),
        ],
      })
        .overrideProvider(REQUEST)
        .useValue(mockRequest)
        .compile()

      service = await module.resolve(RequestLoggerService)
    })

    LogMethodTests.forEach(({ method, level }) => {
      describe(method, () => {
        it(`It should include log context and request context when logging a simple message at ${method} level`, () => {
          service[method](message)

          expect(logs).toContainEqual(
            expect.objectContaining({
              level,
              msg: message,
              ...logContext,
              req: expect.objectContaining({
                method: "POST",
                url: "/api/context",
              }),
            }),
          )
        })

        it(`It should include log context and request context when logging with object context parameter at ${method} level`, () => {
          const contextParam = { userId: "user123", action: "login" }

          service[method](message, contextParam)

          expect(logs).toContainEqual(
            expect.objectContaining({
              level,
              msg: message,
              ...logContext,
              ...contextParam,
              req: expect.objectContaining({
                method: "POST",
                url: "/api/context",
              }),
            }),
          )
        })

        it(`It should include log context and request context when using printf-style interpolation at ${method} level`, () => {
          service[method]("User %s performed %s", username, "login")

          expect(logs).toContainEqual(
            expect.objectContaining({
              level,
              msg: `User ${username} performed login`,
              ...logContext,
              req: expect.objectContaining({
                method: "POST",
                url: "/api/context",
              }),
            }),
          )
        })
      })
    })
  })

  describe("Request Trace ID", () => {
    const mockRequest = express.request({
      method: "POST",
      url: "/api/trace",
      headers: { "user-agent": "test" },
    })

    let logs: any[]
    let service: RequestLoggerService
    beforeEach(async () => {
      logs = []

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            logDestination: new ArrayStream(logs),
            logLevel: "verbose",
          }),
        ],
      })
        .overrideProvider(REQUEST)
        .useValue(mockRequest)
        .compile()

      service = await module.resolve(RequestLoggerService)
    })

    it("It should generate a new unique ULID per instance", async () => {
      const logs2: any[] = []
      const module2: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            logDestination: new ArrayStream(logs2),
            logLevel: "verbose",
          }),
        ],
      })
        .overrideProvider(REQUEST)
        .useValue(mockRequest)
        .compile()

      const service2 = await module2.resolve(RequestLoggerService)

      service.log("First request")
      service2.log("Second request")

      const traceId1 = logs[0].requestTraceId
      const traceId2 = logs2[0].requestTraceId

      expect(logs[0].requestTraceId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/i)
      expect(logs2[0].requestTraceId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/i)
      expect(traceId1).not.toBe(traceId2)
    })

    it("It should not let a configured logContext.requestTraceId override the per-request id", async () => {
      const logs2: any[] = []
      const perRequestTraceId = "per-request-id-wins"
      const req = express.request({
        headers: { "x-trace-id": perRequestTraceId },
      })
      const module2: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            logDestination: new ArrayStream(logs2),
            logLevel: "verbose",
            logRequestTraceIdHeader: "x-trace-id",
            logContext: { requestTraceId: "static-should-not-win" },
          }),
        ],
      })
        .overrideProvider(REQUEST)
        .useValue(req)
        .compile()

      const scopedService = await module2.resolve(RequestLoggerService)
      scopedService.log("traced")

      expect(logs2[0].requestTraceId).toBe(perRequestTraceId)
    })

    it("It should include the same ULID for each request scoped log message", async () => {
      service.verbose!("Verbose log")
      service.debug!("Debug log")
      service.log("Info log")
      service.warn("Warning log")
      service.error("Error log")
      service.fatal!("Fatal log")

      const { requestTraceId } = logs[0]

      expect(logs[0]).toMatchObject({
        level: LogLevelNumber.verbose,
        requestTraceId,
      })
      expect(logs[1]).toMatchObject({
        level: LogLevelNumber.debug,
        requestTraceId,
      })
      expect(logs[2]).toMatchObject({
        level: LogLevelNumber.log,
        requestTraceId,
      })
      expect(logs[3]).toMatchObject({
        level: LogLevelNumber.warn,
        requestTraceId,
      })
      expect(logs[4]).toMatchObject({
        level: LogLevelNumber.error,
        requestTraceId,
      })
      expect(logs[5]).toMatchObject({
        level: LogLevelNumber.fatal,
        requestTraceId,
      })
    })

    it("should include requestTraceId with both simple and complex logging patterns", () => {
      const contextObject = { userId: "123", action: "test" }

      service.log("Simple message")
      service.log("Object message", contextObject)
      service.log("User %s performed %s", username, "action")

      const traceId = logs[0].requestTraceId

      expect(logs[0]).toMatchObject({
        msg: "Simple message",
        requestTraceId: traceId,
      })
      expect(logs[1]).toMatchObject({
        msg: "Object message",
        ...contextObject,
        requestTraceId: traceId,
      })
      expect(logs[2]).toMatchObject({
        msg: `User ${username} performed action`,
        requestTraceId: traceId,
      })
    })

    it("It should include requestTraceId alongside logContext when configured", async () => {
      const logs: any[] = []
      const logContext = {
        service: "test-service",
        version: "1.0.0",
      }

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            logDestination: new ArrayStream(logs),
            logContext: logContext,
          }),
        ],
      })
        .overrideProvider(REQUEST)
        .useValue(mockRequest)
        .compile()

      const service = await module.resolve(RequestLoggerService)
      service.log("Context test")

      expect(logs[0]).toMatchObject({
        ...logContext,
        requestTraceId: expect.stringMatching(/^[0-9A-HJKMNP-TV-Z]{26}$/i),
      })
    })

    const header = `x-${faker.hacker.noun().toLowerCase()}-id`
    const value = randomUUID()
    describe(`forRoot({ traceHeaderId: "${header}" })`, () => {
      const logContext = { service: faker.internet.domainWord() }
      const message = faker.hacker.phrase()
      let logs: any[]

      describe(`When header req.headers.${header} has the value ${value}`, () => {
        let service: RequestLoggerService
        beforeEach(async () => {
          logs = []
          const req = express.request({ headers: { [header]: value } })
          const module: TestingModule = await Test.createTestingModule({
            imports: [
              LoggingModule.forRoot({
                logLevel: "verbose",
                logDestination: new ArrayStream(logs),
                logContext: logContext,
                logRequestTraceIdHeader: header,
              }),
            ],
          })
            .overrideProvider(REQUEST)
            .useValue(req)
            .compile()

          service = await module.resolve(RequestLoggerService)
        })

        it(`It should include a requestTraceId key with the value ${value} in subsequent log calls`, () => {
          const event = { username: faker.internet.username() }
          service.verbose(message, event)
          service.debug(message, event)
          service.log(message, event)
          service.warn(message, event)
          service.error(message, event)
          service.fatal(message, event)

          expect(logs[0]).toMatchObject({
            level: LogLevelNumber.verbose,
            msg: message,
            requestTraceId: value,
            ...logContext,
            ...event,
          })
          expect(logs[1]).toMatchObject({
            level: LogLevelNumber.debug,
            msg: message,
            requestTraceId: value,
            ...logContext,
            ...event,
          })
          expect(logs[2]).toMatchObject({
            level: LogLevelNumber.log,
            msg: message,
            requestTraceId: value,
            ...logContext,
            ...event,
          })
          expect(logs[3]).toMatchObject({
            level: LogLevelNumber.warn,
            msg: message,
            requestTraceId: value,
            ...logContext,
            ...event,
          })
          expect(logs[4]).toMatchObject({
            level: LogLevelNumber.error,
            msg: message,
            requestTraceId: value,
            ...logContext,
            ...event,
          })
          expect(logs[5]).toMatchObject({
            level: LogLevelNumber.fatal,
            msg: message,
            requestTraceId: value,
            ...logContext,
            ...event,
          })
        })
      })

      describe(`When header req.headers.${header.toUpperCase()} has the value ${value}`, () => {
        let service: RequestLoggerService
        beforeEach(async () => {
          logs = []
          const req = express.request({
            headers: { [header.toUpperCase()]: value },
          })

          const module: TestingModule = await Test.createTestingModule({
            imports: [
              LoggingModule.forRoot({
                logLevel: "verbose",
                logDestination: new ArrayStream(logs),
                logContext: logContext,
                logRequestTraceIdHeader: header,
              }),
            ],
          })
            .overrideProvider(REQUEST)
            .useValue(req)
            .compile()

          service = await module.resolve(RequestLoggerService)
        })

        it(`It should include a requestTraceId key with the value ${value} in subsequent log calls`, () => {
          const event = { username: faker.internet.username() }
          service.verbose(message, event)
          service.debug(message, event)
          service.log(message, event)
          service.warn(message, event)
          service.error(message, event)
          service.fatal(message, event)

          expect(logs[0]).toMatchObject({
            level: LogLevelNumber.verbose,
            msg: message,
            requestTraceId: value,
            ...logContext,
            ...event,
          })
          expect(logs[1]).toMatchObject({
            level: LogLevelNumber.debug,
            msg: message,
            requestTraceId: value,
            ...logContext,
            ...event,
          })
          expect(logs[2]).toMatchObject({
            level: LogLevelNumber.log,
            msg: message,
            requestTraceId: value,
            ...logContext,
            ...event,
          })
          expect(logs[3]).toMatchObject({
            level: LogLevelNumber.warn,
            msg: message,
            requestTraceId: value,
            ...logContext,
            ...event,
          })
          expect(logs[4]).toMatchObject({
            level: LogLevelNumber.error,
            msg: message,
            requestTraceId: value,
            ...logContext,
            ...event,
          })
          expect(logs[5]).toMatchObject({
            level: LogLevelNumber.fatal,
            msg: message,
            requestTraceId: value,
            ...logContext,
            ...event,
          })
        })
      })

      describe(`When header req.headers.${header.toUpperCase()} is not present`, () => {
        let service: RequestLoggerService
        beforeEach(async () => {
          logs = []
          const req = express.request()

          const module: TestingModule = await Test.createTestingModule({
            imports: [
              LoggingModule.forRoot({
                logLevel: "verbose",
                logDestination: new ArrayStream(logs),
                logContext: logContext,
                logRequestTraceIdHeader: header,
              }),
            ],
          })
            .overrideProvider(REQUEST)
            .useValue(req)
            .compile()

          service = await module.resolve(RequestLoggerService)
        })

        it("It should include the same ULID for each request scoped log message", async () => {
          logs.length = 0

          service.verbose!("Verbose log")
          service.debug!("Debug log")
          service.log("Info log")
          service.warn("Warning log")
          service.error("Error log")
          service.fatal!("Fatal log")

          const { requestTraceId } = logs[0]

          expect(logs[0].requestTraceId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/i)
          expect(logs[0]).toMatchObject({
            level: LogLevelNumber.verbose,
            requestTraceId,
          })
          expect(logs[1]).toMatchObject({
            level: LogLevelNumber.debug,
            requestTraceId,
          })
          expect(logs[2]).toMatchObject({
            level: LogLevelNumber.log,
            requestTraceId,
          })
          expect(logs[3]).toMatchObject({
            level: LogLevelNumber.warn,
            requestTraceId,
          })
          expect(logs[4]).toMatchObject({
            level: LogLevelNumber.error,
            requestTraceId,
          })
          expect(logs[5]).toMatchObject({
            level: LogLevelNumber.fatal,
            requestTraceId,
          })
        })

        it("It should log a single warning during construction about the missing header", () => {
          expect(logs[0]).toMatchObject({
            level: LogLevelNumber.warn,
            msg: `Request Trace Header '${header}' not found, auto-generating trace ID: ${logs[0].requestTraceId}`,
          })
        })
      })
    })
  })
})
