import { HttpStatus } from "@nestjs/common"
import { managedAppInstance } from "@neomaventures/managed-app"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"

const { OK } = HttpStatus

describe("GET /api/health", () => {
  describe("When a health check request is made", () => {
    it(`should respond with HTTP ${OK} and { http: "ok" }`, async () => {
      const app = await managedAppInstance({
        configure: configureViewEngine,
      })

      await request(app.getHttpServer())
        .get("/api/health")
        .expect(OK)
        .expect({ http: "ok" })
    })
  })
})
