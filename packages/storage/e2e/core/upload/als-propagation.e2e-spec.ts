import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import request from "supertest"

/**
 * Regression test for #231 — `MultipartMiddleware` previously dropped the
 * caller's `AsyncLocalStorage` frame for body parsing that spans multiple
 * event-loop ticks. The fix wraps multer's deferred callback in
 * `AsyncResource.bind` so the frame survives invocation.
 *
 * Pattern note: the marker ALS frame is opened by a Nest middleware
 * (`MarkerMiddleware` in the test app module) rather than via `app.use`,
 * to mirror the production topology where `@neomaventures/request-context`
 * opens its frame inside a Nest middleware mounted with
 * `consumer.apply(...).forRoutes("*")`. The controller reads the frame
 * after multer has parsed the body; without the `AsyncResource.bind` fix
 * the larger payloads return `undefined`.
 *
 * Sweep for #236 covers 100KB → 5MB so any future regression in the
 * `AsyncResource.bind` site shows up before consumers hit it. NOTE: at
 * the time this spike landed, all six sizes pass in the storage-only
 * topology — the failure reported on POST /profile/avatar in the saas
 * template at 3MB+ is not reproducible from `@neomaventures/storage`
 * alone. See #236 for the ownership decision.
 */
describe("MultipartMiddleware — ALS propagation (regression for #231, #236)", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({
      module: "e2e/app/als-bug-app.module.ts#AlsBugAppModule",
    })
  })

  const sizes = [
    { label: "100KB", bytes: 100_000 },
    { label: "800KB (existing ceiling)", bytes: 800_000 },
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
