import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"

const { OK } = HttpStatus

describe("GET /status", () => {
  describe("When the status page is requested", () => {
    it(`should respond with HTTP ${OK}`, async () => {
      const app = await managedAppInstance({ configure: configureViewEngine })

      await request(app.getHttpServer()).get("/status").expect(OK)
    })

    it("should set Cache-Control: no-store", async () => {
      const app = await managedAppInstance({ configure: configureViewEngine })

      await request(app.getHttpServer())
        .get("/status")
        .expect("Cache-Control", "no-store")
    })

    it("should render an HTML body containing the operational banner", async () => {
      const app = await managedAppInstance({ configure: configureViewEngine })

      await request(app.getHttpServer())
        .get("/status")
        .expect("Content-Type", /text\/html/)
        .expect(/All systems operational/)
    })
  })
})
