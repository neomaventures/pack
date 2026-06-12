import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"

const { OK } = HttpStatus

describe("GET /health", () => {
  describe("When the status page is requested", () => {
    // The Cache-Control header is the most operationally interesting bit:
    // with `no-store`, every refresh re-runs the probes, which matters when
    // an operator is staring at this page. The other assertions
    // (status, content-type, body content) are conventional.
    it("should render fresh HTML with no-store caching and the operational banner", async () => {
      const app = await managedAppInstance({ configure: configureViewEngine })

      await request(app.getHttpServer())
        .get("/health")
        .expect(OK)
        .expect("Cache-Control", "no-store")
        .expect("Content-Type", /text\/html/)
        .expect(/All systems operational/)
    })
  })
})
