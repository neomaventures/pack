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
    it("should respond with HTTP 200, http + database ok, and an ISO checkedAt", async () => {
      // Body assertion is split: supertest's `.expect(body)` requires exact
      // equality, but `checkedAt` is dynamic — switch to a callback only for
      // the fields we can't deep-equal against literals.
      await request(app.getHttpServer())
        .get("/api/health")
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({
            http: "ok",
            database: "ok",
            checkedAt: expect.stringMatching(ISO_TIMESTAMP),
          })
        })
    })
  })
})
