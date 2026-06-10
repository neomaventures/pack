import { type INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { getDataSourceToken } from "@nestjs/typeorm"
import request from "supertest"
import { type App } from "supertest/types"

import { AppModule } from "../../fixtures/app.module"

describe("GET /api/health (DataSource query rejects)", () => {
  let app: INestApplication<App>

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue({
        query: (): Promise<never> =>
          Promise.reject(new Error("connection refused")),
      })
      .compile()

    app = moduleRef.createNestApplication<App>()
    await app.init()
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
