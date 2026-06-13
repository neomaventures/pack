import { faker } from "@faker-js/faker"
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
 * Pattern note: opening an ALS frame inline via `app.use` is **not** a
 * common pattern elsewhere in this repo — production consumers
 * (e.g. `@neomaventures/request-context`) open their frames inside a
 * dedicated Nest middleware that runs early in the pipeline. We do it via
 * the `configure` callback here purely to reproduce the upstream
 * topology in a single spec without dragging in a second package: the
 * Express boundary `app.use` runs before any Nest middleware including
 * `MultipartMiddleware`, which is exactly the lifecycle the bug surfaces
 * in. The controller reads the frame after multer has parsed the body;
 * without the fix the larger payloads return `undefined`.
 */
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
          .attach("file", Buffer.from(faker.string.alphanumeric(bytes)), {
            filename: `payload-${bytes}.bin`,
            contentType: "application/octet-stream",
          })
          .expect(201)
          .expect({ markerFromAls: marker })
      })
    })
  })
})
