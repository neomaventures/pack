import { type INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import request from "supertest"
import { type App } from "supertest/types"

import { AppWithoutDbModule } from "../../fixtures/app-without-db.module"

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

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
    it("should respond with HTTP 200 and the http probe only", async () => {
      const { body } = await request(app.getHttpServer())
        .get("/api/health")
        .expect(200)

      expect(body).toEqual({
        http: "ok",
        checkedAt: expect.stringMatching(ISO_TIMESTAMP),
      })
    })
  })
})
