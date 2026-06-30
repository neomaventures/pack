import { managedAppInstance } from "@neomaventures/managed-app"
import { mockserver } from "@neomaventures/mockserver/fixture"
import request from "supertest"

import { ISO_TIMESTAMP } from "../../fixtures/iso-timestamp"

// Stable paths populated before the managed app is compiled so that the
// `AppWithProbesModule` factory captures them on first build. The
// `managedAppInstance` helper caches by module path, so reusing the same
// instance across `it` blocks is safe — each test resets mockserver
// expectations via the auto `beforeEach` shipped from
// `@neomaventures/mockserver/fixture`.
const MOCKSERVER_ORIGIN = process.env.MOCKSERVER_URL!.replace("/mockserver", "")
const STORAGE_PATH = "/storage-health"
const MAIL_PATH = "/mail-health"
process.env.STORAGE_HEALTH_URL = `${MOCKSERVER_ORIGIN}${STORAGE_PATH}`
process.env.MAIL_HEALTH_URL = `${MOCKSERVER_ORIGIN}${MAIL_PATH}`

describe("GET /api/health (with probes configured)", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance(
      "e2e/fixtures/app-with-probes.module.ts#AppWithProbesModule",
    )
  })

  describe("Given all probes are healthy", () => {
    it("returns HTTP 200 with each probe's latency", async () => {
      await mockserver.createExpectation({
        httpRequest: { path: STORAGE_PATH, method: "GET" },
        httpResponse: { statusCode: 200, body: "ok" },
        times: { unlimited: true },
      })
      await mockserver.createExpectation({
        httpRequest: { path: MAIL_PATH, method: "GET" },
        httpResponse: { statusCode: 200, body: "ok" },
        times: { unlimited: true },
      })

      const { body } = await request(app.getHttpServer())
        .get("/api/health")
        .expect(200)

      expect(body).toMatchObject({
        http: "ok",
        probes: {
          storage: { ok: true, latencyMs: expect.any(Number) },
          mail: { ok: true, latencyMs: expect.any(Number) },
        },
        checkedAt: expect.stringMatching(ISO_TIMESTAMP),
      })
    })
  })

  describe("Given an upstream returns 503", () => {
    it("returns HTTP 503 and flags the failing probe", async () => {
      await mockserver.createExpectation({
        httpRequest: { path: STORAGE_PATH, method: "GET" },
        httpResponse: { statusCode: 200, body: "ok" },
        times: { unlimited: true },
      })
      await mockserver.createExpectation({
        httpRequest: { path: MAIL_PATH, method: "GET" },
        httpResponse: { statusCode: 503, body: "down" },
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
            error: "Expected 2xx, got 503",
          },
        },
        checkedAt: expect.stringMatching(ISO_TIMESTAMP),
      })
    })
  })

  describe("Given an upstream is unreachable", () => {
    it("returns HTTP 503 with the network error", async () => {
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
