import { type INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import request from "supertest"
import { type App } from "supertest/types"

import { AppModule } from "../../fixtures/app.module"

describe("GET /api/health (with TypeORM DataSource)", () => {
  let app: INestApplication<App>

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication<App>()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  describe("When the DataSource is healthy", () => {
    it("should respond with HTTP 200 and the http + database probes ok", async () => {
      await request(app.getHttpServer())
        .get("/api/health")
        .expect(200)
        .expect({ http: "ok", database: "ok" })
    })
  })
})
