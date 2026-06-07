import { HttpStatus } from "@nestjs/common"
import { managedAppInstance } from "@neomaventures/managed-app"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"

const { INTERNAL_SERVER_ERROR, SEE_OTHER } = HttpStatus

describe("Error handling", () => {
  describe("Render mode", () => {
    describe("GET /?error=true with Accept: text/html", () => {
      it(`should respond with HTTP ${INTERNAL_SERVER_ERROR} and the error template`, async () => {
        const app = await managedAppInstance({
          configure: configureViewEngine,
        })

        const response = await request(app.getHttpServer())
          .get("/?error=true")
          .set("Accept", "text/html")
          .expect(INTERNAL_SERVER_ERROR)

        expect(response.text).toContain("Something went wrong")
        expect(response.text).toContain("500")
        expect(response.text).toContain("Something went wrong")
        expect(response.headers["content-type"]).toMatch(/text\/html/)
      })
    })
  })

  describe("Redirect mode", () => {
    describe("GET /redirect-error with Accept: text/html", () => {
      it(`should respond with HTTP ${SEE_OTHER} and a Location header`, async () => {
        const app = await managedAppInstance({
          configure: configureViewEngine,
        })

        await request(app.getHttpServer())
          .get("/redirect-error")
          .set("Accept", "text/html")
          .expect(SEE_OTHER)
          .expect("Location", "/")
      })
    })
  })
})
