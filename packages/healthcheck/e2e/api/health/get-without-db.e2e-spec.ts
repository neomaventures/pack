import { type INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import request from "supertest"
import { type App } from "supertest/types"

import { AppWithoutDbModule } from "../../fixtures/app-without-db.module"

describe("GET /api/health (without TypeORM DataSource)", () => {
  let app: INestApplication<App>

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppWithoutDbModule],
    }).compile()

    app = moduleRef.createNestApplication<App>()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  describe("When no DataSource is registered", () => {
    it("should respond with HTTP 200 and only the http probe", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/health")
        .expect(200)

      expect(response.body).toEqual({ http: "ok" })
    })
  })
})
