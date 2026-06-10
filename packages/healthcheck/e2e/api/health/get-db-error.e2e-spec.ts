import { type INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { getDataSourceToken } from "@nestjs/typeorm"
import request from "supertest"
import { type App } from "supertest/types"
import { type DataSource } from "typeorm"

import { AppModule } from "../../fixtures/app.module"

/**
 * Tests the 503 path against a real `DataSource` whose connection has been
 * torn down — `dataSource.query("SELECT 1")` then rejects with a real
 * TypeORM error. Exercises the genuine error path, not a hand-rolled
 * rejecting double.
 */
describe("GET /api/health (DataSource connection broken)", () => {
  let app: INestApplication<App>

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication<App>()
    await app.init()

    // Destroy the live DataSource after init — subsequent `query()` calls
    // from `HealthService` then fail with a real TypeORM error, exactly the
    // shape consumers will see if their connection pool dies in production.
    const dataSource = moduleRef.get<DataSource>(getDataSourceToken())
    await dataSource.destroy()
  })

  afterEach(async () => {
    await app.close()
  })

  describe("When the database probe rejects", () => {
    it("should respond with HTTP 503 and database: error", async () => {
      await request(app.getHttpServer())
        .get("/api/health")
        .expect(503)
        .expect({ http: "ok", database: "error" })
    })
  })
})
