import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

import { factories } from "../../../test/factories"

const { OK, UNAUTHORIZED, INTERNAL_SERVER_ERROR } = HttpStatus

const SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw"
const SVIX_ID = factories.id()
const SVIX_TIMESTAMP = factories.timestamp()
const BODY = { type: "user.created", data: { id: "usr_123" } }
const BODY_STRING = JSON.stringify(BODY)
const SIGNATURE = factories.signature(
  SECRET,
  SVIX_ID,
  SVIX_TIMESTAMP,
  BODY_STRING,
)

const appModules: [string, string][] = [
  ["forRoot", "e2e/app/app.module.ts#AppModule"],
  ["forRootAsync", "e2e/app/app.async.module.ts#AsyncAppModule"],
]

appModules.forEach(([name, modulePath]) => {
  describe(`POST /webhooks (${name})`, () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>

    beforeEach(async () => {
      app = await managedAppInstance({
        module: modulePath,
        nestApplicationOptions: { rawBody: true },
      })
    })

    describe("When a request is made with a valid signature", () => {
      it("then it should respond with HTTP 200", async () => {
        await request(app.getHttpServer())
          .post("/webhooks")
          .set("svix-id", SVIX_ID)
          .set("svix-timestamp", SVIX_TIMESTAMP)
          .set("svix-signature", SIGNATURE)
          .send(BODY)
          .expect(OK)
          .expect({ received: true })
      })
    })

    describe("When a request is made with an invalid signature", () => {
      it("then it should respond with HTTP 401", async () => {
        await request(app.getHttpServer())
          .post("/webhooks")
          .set("svix-id", SVIX_ID)
          .set("svix-timestamp", SVIX_TIMESTAMP)
          .set(
            "svix-signature",
            factories.signature(
              factories.secret(),
              SVIX_ID,
              SVIX_TIMESTAMP,
              BODY_STRING,
            ),
          )
          .send(BODY)
          .expect(UNAUTHORIZED)
          .expect({
            statusCode: UNAUTHORIZED,
            message: "Invalid webhook signature",
            error: "Unauthorized",
          })
      })
    })

    describe("When a request is made without svix headers", () => {
      it("then it should respond with HTTP 401", async () => {
        await request(app.getHttpServer())
          .post("/webhooks")
          .send(BODY)
          .expect(UNAUTHORIZED)
          .expect({
            statusCode: UNAUTHORIZED,
            message:
              "Missing required webhook headers: svix-id, svix-timestamp, svix-signature",
            error: "Unauthorized",
          })
      })
    })

    describe("When a request is made with partial svix headers", () => {
      it("then it should respond with HTTP 401", async () => {
        await request(app.getHttpServer())
          .post("/webhooks")
          .set("svix-id", SVIX_ID)
          .send(BODY)
          .expect(UNAUTHORIZED)
          .expect({
            statusCode: UNAUTHORIZED,
            message:
              "Missing required webhook headers: svix-id, svix-timestamp, svix-signature",
            error: "Unauthorized",
          })
      })
    })

    describe("When a request is made with a signature missing the v1 prefix", () => {
      it("then it should respond with HTTP 401", async () => {
        await request(app.getHttpServer())
          .post("/webhooks")
          .set("svix-id", SVIX_ID)
          .set("svix-timestamp", SVIX_TIMESTAMP)
          .set(
            "svix-signature",
            factories.signature(
              SECRET,
              SVIX_ID,
              SVIX_TIMESTAMP,
              BODY_STRING,
              faker.hacker.ingverb(),
            ),
          )
          .send(BODY)
          .expect(UNAUTHORIZED)
          .expect({
            statusCode: UNAUTHORIZED,
            message: "Invalid webhook signature",
            error: "Unauthorized",
          })
      })
    })

    describe("When a request is made with a tampered body", () => {
      it("then it should respond with HTTP 401", async () => {
        await request(app.getHttpServer())
          .post("/webhooks")
          .set("svix-id", SVIX_ID)
          .set("svix-timestamp", SVIX_TIMESTAMP)
          .set("svix-signature", SIGNATURE)
          .send({ tampered: true })
          .expect(UNAUTHORIZED)
          .expect({
            statusCode: UNAUTHORIZED,
            message: "Invalid webhook signature",
            error: "Unauthorized",
          })
      })
    })
  })
})

describe("POST /webhooks (rawBody disabled)", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({
      module: "e2e/app/app.module.ts#AppModule",
    })
  })

  describe("When a validly-signed request is made without rawBody enabled", () => {
    it("then it should respond with HTTP 500", async () => {
      await request(app.getHttpServer())
        .post("/webhooks")
        .set("svix-id", SVIX_ID)
        .set("svix-timestamp", SVIX_TIMESTAMP)
        .set("svix-signature", SIGNATURE)
        .send(BODY)
        .expect(INTERNAL_SERVER_ERROR)
        .expect({
          statusCode: INTERNAL_SERVER_ERROR,
          message:
            "rawBody is not available. Enable rawBody: true in NestFactory.create() options.",
          error: "Internal Server Error",
        })
    })
  })
})
