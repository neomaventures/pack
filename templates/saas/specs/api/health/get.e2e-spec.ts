import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"

const { OK } = HttpStatus

describe("GET /api/health", () => {
  describe("When a health check request is made", () => {
    it(`should respond with HTTP ${OK} and { http: "ok", database: "ok" }`, async () => {
      const app = await managedAppInstance({
        configure: configureViewEngine,
      })

      await request(app.getHttpServer())
        .get("/api/health")
        .expect(OK)
        .expect({ http: "ok", database: "ok" })
    })
  })
})
