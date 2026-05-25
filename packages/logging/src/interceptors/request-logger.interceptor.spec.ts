/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { LOGGING_MODULE_OPTIONS, LoggingModule } from "@neoma/logging"
import {
  Controller,
  Get,
  Post,
  Body,
  HttpStatus,
  INestApplication,
} from "@nestjs/common"
import { Test, TestingModule } from "@nestjs/testing"
import { LogLevelNumber, ArrayStream } from "fixtures/logging"
import supertest from "supertest"
import { App } from "supertest/types"

@Controller("test")
class TestController {
  @Get()
  getTest() {
    return { message: "success" }
  }

  @Post()
  postTest(@Body() body: any) {
    return { received: body }
  }

  @Get("error")
  errorTest() {
    throw new Error("Test error")
  }
}

const routeMetaData = {
  controller: {
    name: TestController.name,
    path: "test",
  },
  handler: {
    name: "getTest",
    path: "/",
  },
}

describe("RequestLoggerInterceptor", () => {
  let app: INestApplication<App>
  let logs: any[]

  describe("Default (LoggingModule)", () => {
    beforeEach(async () => {
      logs = []
      const module: TestingModule = await Test.createTestingModule({
        imports: [LoggingModule.forRoot()],
        controllers: [TestController],
      })
        .overrideProvider(LOGGING_MODULE_OPTIONS)
        .useValue({
          logDestination: new ArrayStream(logs),
        })
        .compile()

      app = module.createNestApplication({ logger: false })
      await app.init()
    })

    afterEach(async () => {
      await app.close()
    })

    it("should not log requests", async () => {
      await supertest(app.getHttpServer()).get("/test").expect(HttpStatus.OK)
      expect(logs.length).toBe(0)
    })

    it("should not log errors", async () => {
      await supertest(app.getHttpServer())
        .get("/test/error")
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)

      expect(logs.length).toBe(0)
    })
  })

  describe("forRoot()", () => {
    beforeEach(async () => {
      logs = []
      const module: TestingModule = await Test.createTestingModule({
        imports: [LoggingModule.forRoot()],
        controllers: [TestController],
      })
        .overrideProvider(LOGGING_MODULE_OPTIONS)
        .useValue({
          logDestination: new ArrayStream(logs),
        })
        .compile()

      app = module.createNestApplication({ logger: false })
      await app.init()
    })

    afterEach(async () => {
      await app.close()
    })

    it("should not log requests", async () => {
      await supertest(app.getHttpServer()).get("/test").expect(HttpStatus.OK)
      expect(logs.length).toBe(0)
    })

    it("should not log errors", async () => {
      await supertest(app.getHttpServer())
        .get("/test/error")
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)

      expect(logs.length).toBe(0)
    })
  })

  describe("forRoot({ logLevel: 'log' })", () => {
    beforeEach(async () => {
      logs = []
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            logDestination: new ArrayStream(logs),
            logLevel: "log",
          }),
        ],
        controllers: [TestController],
      }).compile()

      app = module.createNestApplication({ logger: false })
      await app.init()
    })

    afterEach(async () => {
      await app.close()
    })

    it("should not log requests", async () => {
      await supertest(app.getHttpServer()).get("/test").expect(HttpStatus.OK)
      expect(logs.length).toBe(0)
    })

    it("should not log errors", async () => {
      await supertest(app.getHttpServer())
        .get("/test/error")
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)

      expect(logs.length).toBe(0)
    })
  })

  describe("forRoot({ logLevel: 'debug' })", () => {
    beforeEach(async () => {
      logs = []
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            logDestination: new ArrayStream(logs),
            logLevel: "debug",
          }),
        ],
        controllers: [TestController],
      }).compile()

      app = module.createNestApplication({ logger: false })
      await app.init()
    })

    afterEach(async () => {
      await app.close()
    })

    it("should log requests", async () => {
      await supertest(app.getHttpServer()).get("/test").expect(HttpStatus.OK)

      expect(logs[0]).toMatchObject({
        ...routeMetaData,
        level: LogLevelNumber.debug,
        msg: "Processing an incoming request and dispatching it to a route handler.",
        req: { baseUrl: "/test" },
      })
      expect(logs[1]).toMatchObject({
        ...routeMetaData,
        level: LogLevelNumber.debug,
        msg: "Processed an incoming request that was successfully handled by a route handler.",
        req: { baseUrl: "/test" },
        res: { statusCode: HttpStatus.OK },
        duration: expect.stringMatching(/^\d+ms$/),
      })
    })

    it("should not log errors", async () => {
      await supertest(app.getHttpServer())
        .get("/test/error")
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)

      expect(logs.length).toBe(1)
    })
  })

  describe("forRoot({ logErrors: true })", () => {
    beforeEach(async () => {
      logs = []
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            logDestination: new ArrayStream(logs),
            logErrors: true,
          }),
        ],
        controllers: [TestController],
      }).compile()

      app = module.createNestApplication({ logger: false })
      await app.init()
    })

    afterEach(async () => {
      await app.close()
    })

    it("should not log requests", async () => {
      await supertest(app.getHttpServer()).get("/test").expect(HttpStatus.OK)
      expect(logs.length).toBe(0)
    })

    it("should log errors", async () => {
      await supertest(app.getHttpServer())
        .get("/test/error")
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)

      expect(logs[0]).toMatchObject({
        level: LogLevelNumber.error,
        msg: "Error processing an incoming request in the route handler.",
        req: { baseUrl: "/test/error" },
        duration: expect.stringMatching(/^\d+ms$/),
        err: {
          message: "Test error",
        },
      })
    })
  })

  describe("forRoot({ logErrors: false })", () => {
    beforeEach(async () => {
      logs = []
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            logDestination: new ArrayStream(logs),
            logErrors: false,
          }),
        ],
        controllers: [TestController],
      }).compile()

      app = module.createNestApplication({ logger: false })
      await app.init()
    })

    afterEach(async () => {
      await app.close()
    })

    it("should not log requests", async () => {
      await supertest(app.getHttpServer()).get("/test").expect(HttpStatus.OK)
      expect(logs.length).toBe(0)
    })

    it("should not log errors", async () => {
      await supertest(app.getHttpServer())
        .get("/test/error")
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)

      expect(logs.length).toBe(0)
    })
  })

  describe("forRoot({ logLevel: 'debug', logErrors: true })", () => {
    beforeEach(async () => {
      logs = []
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          LoggingModule.forRoot({
            logDestination: new ArrayStream(logs),
            logLevel: "debug",
            logErrors: true,
          }),
        ],
        controllers: [TestController],
      }).compile()

      app = module.createNestApplication({ logger: false })
      await app.init()
    })

    afterEach(async () => {
      await app.close()
    })

    it("should log requests", async () => {
      await supertest(app.getHttpServer()).get("/test").expect(HttpStatus.OK)

      expect(logs[0]).toMatchObject({
        ...routeMetaData,
        level: LogLevelNumber.debug,
        msg: "Processing an incoming request and dispatching it to a route handler.",
        req: { baseUrl: "/test" },
      })
      expect(logs[1]).toMatchObject({
        ...routeMetaData,
        level: LogLevelNumber.debug,
        msg: "Processed an incoming request that was successfully handled by a route handler.",
        req: { baseUrl: "/test" },
        res: { statusCode: HttpStatus.OK },
        duration: expect.stringMatching(/^\d+ms$/),
      })
    })

    it("should log errors", async () => {
      await supertest(app.getHttpServer())
        .get("/test/error")
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)

      expect(logs[1]).toMatchObject({
        level: LogLevelNumber.error,
        msg: "Error processing an incoming request in the route handler.",
        req: { baseUrl: "/test/error" },
        duration: expect.stringMatching(/^\d+ms$/),
        err: {
          message: "Test error",
        },
      })
    })
  })
})
