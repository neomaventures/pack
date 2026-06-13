import { managedAppInstance } from "@neomaventures/managed-app"
import { type NextFunction, type Request, type Response } from "express"
import request from "supertest"

import { als } from "../../app/als-bug-app.module"

/**
 * Regression test for #231 — `MultipartMiddleware` previously dropped the
 * caller's `AsyncLocalStorage` frame for body parsing that spans multiple
 * event-loop ticks. The fix wraps multer's deferred callback in
 * `AsyncResource.bind` so the frame survives invocation.
 *
 * The spec opens an ALS frame at the Express boundary via the `configure`
 * callback `managedAppInstance` exposes, guaranteed to run before
 * `MultipartMiddleware`. The controller reads the frame after multer has
 * parsed the body; without the fix the larger payloads return `undefined`
 * and the assertion fails.
 */

const bodyOfSize = (bytes: number): Buffer => {
  const buffer = Buffer.alloc(bytes)
  for (let i = 0; i < bytes; i++) {
    buffer[i] = i % 256
  }
  return buffer
}

describe("MultipartMiddleware — ALS propagation (regression for #231)", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({
      module: "e2e/app/als-bug-app.module.ts#AlsBugAppModule",
      configure: (created) => {
        created.use(
          (req: Request, _res: Response, next: NextFunction): void => {
            const marker = (req.headers["x-test-marker"] as string) ?? "missing"
            als.run({ marker }, () => next())
          },
        )
      },
    })
  })

  const sizes = [
    { label: "2KB (single chunk)", bytes: 2_048 },
    { label: "200KB (multi-chunk)", bytes: 200_000 },
    { label: "800KB (many chunks)", bytes: 800_000 },
  ]

  sizes.forEach(({ label, bytes }) => {
    describe(`Given a multipart upload of ${label}`, () => {
      it("should preserve the upstream ALS frame in the controller", async () => {
        const marker = `marker-${bytes}`
        await request(app.getHttpServer())
          .post("/als/upload")
          .set("x-test-marker", marker)
          .attach("file", bodyOfSize(bytes), {
            filename: `payload-${bytes}.bin`,
            contentType: "application/octet-stream",
          })
          .expect(201)
          .expect({ markerFromAls: marker })
      })
    })
  })
})
