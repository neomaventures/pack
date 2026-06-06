import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import * as svix from "fixtures/svix"
import request from "supertest"

const { BAD_REQUEST, INTERNAL_SERVER_ERROR } = HttpStatus

const SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"
const SVIX_ID = svix.id()
const SVIX_TIMESTAMP = svix.timestamp()
const BODY = { type: "user.created", data: { id: "usr_123" } }
const BODY_STRING = JSON.stringify(BODY)
const SIGNATURE = svix.signature(SECRET, SVIX_ID, SVIX_TIMESTAMP, BODY_STRING)

const appModules: [string, string][] = [
  ["forRoot", "e2e/app/app.module.ts#AppModule"],
  ["forRootAsync", "e2e/app/app.async.module.ts#AsyncAppModule"],
]

const errorCodes = [
  ["400", BAD_REQUEST],
  ["500", INTERNAL_SERVER_ERROR],
] as const

appModules.forEach(([name, modulePath]) => {
  describe(`POST /webhooks/handled/error — error propagation (${name})`, () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>

    beforeEach(async () => {
      app = await managedAppInstance({
        module: modulePath,
        nestApplicationOptions: { rawBody: true },
      })
    })

    errorCodes.forEach(([status, expectedStatus]) => {
      describe(`When the handler throws an HTTP ${status} error`, () => {
        it(`should propagate as HTTP ${status}`, async () => {
          await request(app.getHttpServer())
            .post(`/webhooks/handled/error?status=${status}`)
            .set("svix-id", SVIX_ID)
            .set("svix-timestamp", SVIX_TIMESTAMP)
            .set("svix-signature", SIGNATURE)
            .send(BODY)
            .expect(expectedStatus)
            .expect({
              statusCode: expectedStatus,
              message: "handler exploded",
            })
        })
      })
    })
  })
})
