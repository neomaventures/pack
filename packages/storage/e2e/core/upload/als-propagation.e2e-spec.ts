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
 * Also provides the success-path half of the #236 spike's symmetric
 * regression coverage: extends the payload sweep up to 5MB so the success
 * path mirrors the over-limit error path covered by
 * `limit-als-propagation.e2e-spec.ts`. Together the two specs prove the ALS
 * frame survives multer's full parse in both directions across the full
 * size range investigated by the #236 spike. See
 * https://github.com/neomaventures/pack/issues/236.
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
  // The default Jest 5s budget is enough for the smaller cases (≤ 800KB),
  // but the multi-MB cases include real multer parse + supertest + MinIO
  // round-trip overhead and routinely exceed 5s on slow CI runners. Bump
  // the per-test budget for the whole spec so we cover the success path
  // without spurious timeouts.
  jest.setTimeout(30_000)

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
    { label: "100KB", bytes: 100_000 },
    { label: "800KB", bytes: 800_000 },
    { label: "1MB", bytes: 1_000_000 },
    { label: "2MB", bytes: 2_000_000 },
    { label: "3MB", bytes: 3_000_000 },
    { label: "5MB", bytes: 5_000_000 },
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
