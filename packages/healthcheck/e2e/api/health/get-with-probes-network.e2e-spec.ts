import { faker } from "@faker-js/faker"
import { mockserver } from "@neomaventures/mockserver/fixture"
import { type INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import request from "supertest"
import { type App } from "supertest/types"

import { AppWithProbesModule } from "../../fixtures/app-with-probes.module"
import { ISO_TIMESTAMP } from "../../fixtures/iso-timestamp"

const STORAGE_PATH = `/storage-health-${faker.string.alphanumeric(8)}`
const MAIL_PATH = `/mail-health-${faker.string.alphanumeric(8)}`
process.env.STORAGE_HEALTH_URL = `${process.env.MOCKSERVER_URL!.replace(
  "/mockserver",
  "",
)}${STORAGE_PATH}`
process.env.MAIL_HEALTH_URL = `${process.env.MOCKSERVER_URL!.replace(
  "/mockserver",
  "",
)}${MAIL_PATH}`

describe("GET /api/health (with probes configured, network failure)", () => {
  let app: INestApplication<App>

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppWithProbesModule],
    }).compile()

    app = moduleRef.createNestApplication<App>()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  describe("When the upstream drops the connection", () => {
    it("should respond with HTTP 503 and report ok: false with a network-error message", async () => {
      await mockserver.createExpectation({
        httpRequest: { path: STORAGE_PATH, method: "GET" },
        httpResponse: { statusCode: 200, body: "ok" },
        times: { unlimited: true },
      })
      await mockserver.createExpectation({
        httpRequest: { path: MAIL_PATH, method: "GET" },
        httpError: { dropConnection: true },
        times: { unlimited: true },
      })

      const { body } = await request(app.getHttpServer())
        .get("/api/health")
        .expect(503)

      expect(body).toMatchObject({
        http: "ok",
        probes: {
          storage: { ok: true, latencyMs: expect.any(Number) },
          mail: {
            ok: false,
            latencyMs: expect.any(Number),
            error: expect.any(String),
          },
        },
        checkedAt: expect.stringMatching(ISO_TIMESTAMP),
      })
      expect(body.probes.mail.error).not.toBe("")
    })
  })
})
