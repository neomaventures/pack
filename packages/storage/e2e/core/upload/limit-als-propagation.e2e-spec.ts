import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import { type NextFunction, type Request, type Response } from "express"
import request from "supertest"

import { limitAls } from "../../app/limit-app.module"

const { CREATED, PAYLOAD_TOO_LARGE } = HttpStatus

/**
 * Regression test for #236 — the saas avatar e2e returns 404 instead of 413
 * for a payload that exceeds the per-route `@Upload({ maxSize })` limit.
 *
 * The saas avatar route topology:
 *   - NO module-level `maxFileSize` → multer always parses the full body.
 *   - Per-route `@Upload({ maxSize: 3_000_000 })` → the interceptor rejects
 *     oversized payloads post-parse.
 *   - A guard reads the principal from ALS and throws 404 if missing.
 *
 * Nest order is: middleware → guards → interceptors → handler. So the guard
 * runs BEFORE the interceptor's size check. If the ALS frame is intact, the
 * guard passes and the interceptor returns 413. If the frame is dropped
 * mid-parse, the guard throws 404 — exactly the saas symptom.
 *
 * This spec replicates that topology inside storage with no auth/saas in the
 * loop, scaling the payload up to match the saas avatar test (3,000,001 B).
 */
describe("MultipartMiddleware — ALS propagation across multer's full parse (regression for #236)", () => {
  // The 3MB+1 case includes a real multer parse + supertest round-trip and
  // routinely exceeds Jest's default 5s budget on slow CI runners. Bump
  // for the whole spec so both cases are covered with the same headroom.
  jest.setTimeout(30_000)

  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({
      module: "e2e/app/limit-app.module.ts#LimitAppModule",
      configure: (created) => {
        created.use(
          (req: Request, _res: Response, next: NextFunction): void => {
            const principal =
              (req.headers["x-test-principal"] as string) ?? "missing"
            limitAls.run({ principal }, () => next())
          },
        )
      },
    })
  })

  describe("Given a payload under the per-route maxSize (2KB)", () => {
    it("should reach the handler with the ALS principal intact (HTTP 201)", async () => {
      await request(app.getHttpServer())
        .post("/limit/upload")
        .set("x-test-principal", faker.string.uuid())
        .attach("file", Buffer.alloc(2_048, "x"), {
          filename: "tiny.bin",
          contentType: "application/octet-stream",
        })
        .expect(CREATED)
    })
  })

  describe("Given a payload exactly 1B over the per-route maxSize (3MB+1B)", () => {
    it("should respond with HTTP 413 — the guard's ALS read must survive the full parse", async () => {
      await request(app.getHttpServer())
        .post("/limit/upload")
        .set("x-test-principal", faker.string.uuid())
        .attach("file", Buffer.alloc(3_000_001, "x"), {
          filename: "over.bin",
          contentType: "application/octet-stream",
        })
        .expect(PAYLOAD_TOO_LARGE)
    })
  })
})
