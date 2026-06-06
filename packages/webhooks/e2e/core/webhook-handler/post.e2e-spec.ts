import { managedAppInstance } from "@neomaventures/managed-app"
import { type WebhookEventEntity } from "@neomaventures/webhooks"
import { HttpStatus } from "@nestjs/common"
import { InboundWebhookEvent } from "fixtures/entities/inbound-webhook-event.entity"
import * as svix from "fixtures/svix"
import request from "supertest"
import { DataSource } from "typeorm"

const { NO_CONTENT, OK } = HttpStatus

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

appModules.forEach(([name, modulePath]) => {
  describe(`POST /webhooks/handled — happy path (${name})`, () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>

    beforeEach(async () => {
      app = await managedAppInstance({
        module: modulePath,
        nestApplicationOptions: { rawBody: true },
      })
    })

    describe("When a unique webhook is received with a valid signature", () => {
      it("should respond with HTTP 200 and the handler response body", async () => {
        await request(app.getHttpServer())
          .post("/webhooks/handled")
          .set("svix-id", SVIX_ID)
          .set("svix-timestamp", SVIX_TIMESTAMP)
          .set("svix-signature", SIGNATURE)
          .send(BODY)
          .expect(OK)
          .expect({ handled: true, type: BODY.type })
      })

      it("should persist the webhook event entity in the database", async () => {
        await request(app.getHttpServer())
          .post("/webhooks/handled")
          .set("svix-id", SVIX_ID)
          .set("svix-timestamp", SVIX_TIMESTAMP)
          .set("svix-signature", SIGNATURE)
          .send(BODY)
          .expect(OK)

        const dataSource = app.get(DataSource)
        const repository = dataSource.getRepository(InboundWebhookEvent)
        const events: WebhookEventEntity[] = await repository.find()

        expect(events).toEqual([
          expect.objectContaining({
            provider: "resend",
            externalId: SVIX_ID,
            receivedAt: expect.toBeBetween(
              new Date(Date.now() - 10_000),
              new Date(Date.now() + 10_000),
            ),
          }),
        ])
      })
    })

    describe("When the same webhook is received a second time", () => {
      it("should respond with HTTP 204 and no body", async () => {
        // First request — should succeed normally
        await request(app.getHttpServer())
          .post("/webhooks/handled")
          .set("svix-id", SVIX_ID)
          .set("svix-timestamp", SVIX_TIMESTAMP)
          .set("svix-signature", SIGNATURE)
          .send(BODY)
          .expect(OK)

        // Second request — same svix-id, should be detected as duplicate
        await request(app.getHttpServer())
          .post("/webhooks/handled")
          .set("svix-id", SVIX_ID)
          .set("svix-timestamp", SVIX_TIMESTAMP)
          .set("svix-signature", SIGNATURE)
          .send(BODY)
          .expect(NO_CONTENT)
          .expect({})
      })

      it("should persist only one entity in the database", async () => {
        // First request
        await request(app.getHttpServer())
          .post("/webhooks/handled")
          .set("svix-id", SVIX_ID)
          .set("svix-timestamp", SVIX_TIMESTAMP)
          .set("svix-signature", SIGNATURE)
          .send(BODY)
          .expect(OK)

        // Second request — duplicate
        await request(app.getHttpServer())
          .post("/webhooks/handled")
          .set("svix-id", SVIX_ID)
          .set("svix-timestamp", SVIX_TIMESTAMP)
          .set("svix-signature", SIGNATURE)
          .send(BODY)
          .expect(NO_CONTENT)

        const dataSource = app.get(DataSource)
        const repository = dataSource.getRepository(InboundWebhookEvent)
        const events: WebhookEventEntity[] = await repository.find()

        expect(events).toHaveLength(1)
      })
    })
  })
})
