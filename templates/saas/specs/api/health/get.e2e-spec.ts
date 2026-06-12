import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"

const { OK } = HttpStatus
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

describe("GET /api/health", () => {
  describe("When a health check request is made", () => {
    it(`should respond with HTTP ${OK} and the aggregated probe result`, async () => {
      const app = await managedAppInstance({
        configure: configureViewEngine,
      })

      const { body } = await request(app.getHttpServer())
        .get("/api/health")
        .expect(OK)

      expect(body).toEqual({
        http: "ok",
        database: "ok",
        checkedAt: expect.stringMatching(ISO_TIMESTAMP),
      })
    })
  })
})
