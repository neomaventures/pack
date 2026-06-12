import { faker } from "@faker-js/faker"
import { Test, type TestingModule } from "@nestjs/testing"
import { getDataSourceToken, TypeOrmModule } from "@nestjs/typeorm"
import { type DataSource } from "typeorm"

import { HealthService } from "./health.service"
import { PROBE_TIMEOUT_MS } from "./healthcheck.constants"

const CHECKED_AT = faker.date.recent()

describe("HealthService", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(CHECKED_AT)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe("check()", () => {
    describe("Given no DataSource is registered", () => {
      let service: HealthService

      beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
          providers: [HealthService],
        }).compile()

        service = module.get<HealthService>(HealthService)
      })

      it("should return only the http probe + checkedAt", async () => {
        const result = await service.check()

        expect(result).toEqual({ http: "ok", checkedAt: CHECKED_AT })
      })
    })

    describe("Given a healthy DataSource is registered", () => {
      let service: HealthService
      let module: TestingModule

      beforeEach(async () => {
        module = await Test.createTestingModule({
          imports: [
            TypeOrmModule.forRoot({
              type: "sqlite",
              database: ":memory:",
              entities: [],
              synchronize: true,
            }),
          ],
          providers: [HealthService],
        }).compile()

        service = module.get<HealthService>(HealthService)
      })

      afterEach(async () => {
        await module.close()
      })

      it('should return { http: "ok", database: "ok", checkedAt }', async () => {
        const result = await service.check()

        expect(result).toEqual({
          http: "ok",
          database: "ok",
          checkedAt: CHECKED_AT,
        })
      })
    })

    describe("Given a DataSource whose query rejects", () => {
      let service: HealthService

      beforeEach(async () => {
        const failingDataSource = {
          query: jest.fn().mockRejectedValue(new Error("connection refused")),
        } as unknown as DataSource

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            HealthService,
            { provide: getDataSourceToken(), useValue: failingDataSource },
          ],
        }).compile()

        service = module.get<HealthService>(HealthService)
      })

      it('should return { http: "ok", database: "error", checkedAt }', async () => {
        const result = await service.check()

        expect(result).toEqual({
          http: "ok",
          database: "error",
          checkedAt: CHECKED_AT,
        })
      })

      it("should not rethrow", async () => {
        await expect(service.check()).resolves.toBeDefined()
      })
    })

    describe("Given a DataSource whose query hangs (never resolves)", () => {
      let service: HealthService

      beforeEach(async () => {
        const hangingDataSource = {
          query: jest.fn().mockReturnValue(new Promise<never>(() => {})),
        } as unknown as DataSource

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            HealthService,
            { provide: getDataSourceToken(), useValue: hangingDataSource },
          ],
        }).compile()

        service = module.get<HealthService>(HealthService)
      })

      it('should time out and return database: "error"', async () => {
        const probe = service.check()
        await jest.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS + 1)

        await expect(probe).resolves.toEqual({
          http: "ok",
          database: "error",
          checkedAt: CHECKED_AT,
        })
      })
    })
  })
})
