import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"

const { INTERNAL_SERVER_ERROR, SEE_OTHER } = HttpStatus

describe("GET /error", () => {
  describe("Given type=render", () => {
    it(`should respond with HTTP ${INTERNAL_SERVER_ERROR} and the error template`, async () => {
      const app = await managedAppInstance({
        configure: configureViewEngine,
      })

      const response = await request(app.getHttpServer())
        .get("/error?type=render")
        .set("Accept", "text/html")
        .expect(INTERNAL_SERVER_ERROR)

      expect(response.text).toContain("Something went wrong")
      expect(response.text).toContain("500")
      expect(response.headers["content-type"]).toMatch(/text\/html/)
    })
  })

  describe("Given type=redirect", () => {
    it(`should respond with HTTP ${SEE_OTHER} and redirect to /`, async () => {
      const app = await managedAppInstance({
        configure: configureViewEngine,
      })

      await request(app.getHttpServer())
        .get("/error?type=redirect")
        .set("Accept", "text/html")
        .expect(SEE_OTHER)
        .expect("Location", "/")
    })
  })
})
