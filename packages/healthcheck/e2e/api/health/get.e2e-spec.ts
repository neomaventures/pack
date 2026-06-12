import { type INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import request from "supertest"
import { type App } from "supertest/types"

import { AppModule } from "../../fixtures/app.module"

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

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
    it("should respond with HTTP 200 and the aggregated probe result", async () => {
      const { body } = await request(app.getHttpServer())
        .get("/api/health")
        .expect(200)

      expect(body).toEqual({
        http: "ok",
        database: "ok",
        checkedAt: expect.stringMatching(ISO_TIMESTAMP),
      })
    })
  })
})
