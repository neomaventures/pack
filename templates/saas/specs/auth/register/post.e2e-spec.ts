import { faker } from "@faker-js/faker"
import { ConfigService } from "@neomaventures/config"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"
import { mailpit } from "~fixtures/email/mailpit"

const { BAD_REQUEST, FOUND, SEE_OTHER } = HttpStatus

describe("POST /auth/register", () => {
  describe("Given the magic link service is operational", () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>

    beforeEach(async () => {
      app = await managedAppInstance({
        configure: configureViewEngine,
      })
    })

    describe("Given an invalid email", () => {
      it(`should respond with HTTP ${BAD_REQUEST} and re-render the form with an error`, async () => {
        const invalidEmail = faker.string.alpha(10)

        const response = await request(app.getHttpServer())
          .post("/auth/register")
          .send({ email: invalidEmail })
          .set("Accept", "text/html")
          .expect(BAD_REQUEST)

        expect(response.headers["content-type"]).toMatch(/text\/html/)
        expect(response.text).toContain("Sign up")
        expect(response.text).toContain(invalidEmail)
        expect(response.text).toContain("Please enter a valid email address.")
      })
    })

    describe("Given an empty body", () => {
      it(`should respond with HTTP ${BAD_REQUEST} and re-render the form with an error`, async () => {
        const response = await request(app.getHttpServer())
          .post("/auth/register")
          .send({})
          .set("Accept", "text/html")
          .expect(BAD_REQUEST)

        expect(response.headers["content-type"]).toMatch(/text\/html/)
        expect(response.text).toContain("Sign up")
      })
    })

    describe("Given a valid email", () => {
      const email = faker.internet.email()

      it(`should redirect to /auth/magic-link/sent with the email`, async () => {
        await request(app.getHttpServer())
          .post("/auth/register")
          .send({ email })
          .expect(FOUND)
          .expect(
            "Location",
            `/auth/magic-link/sent?email=${encodeURIComponent(email)}`,
          )
      })

      it("should send a magic link email to the submitted address", async () => {
        await request(app.getHttpServer())
          .post("/auth/register")
          .send({ email })

        const message = await mailpit.findByRecipient(email)
        // TODO : We should test the content of the email.
        expect(message).toBeDefined()
      })
    })
  })

  describe("Given SMTP is misconfigured", () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>

    beforeEach(async () => {
      app = await managedAppInstance({
        configure: configureViewEngine,
        build: (builder) =>
          builder.overrideProvider(ConfigService).useValue({
            smtpHost: "localhost",
            smtpPort: "19999",
            smtpUser: "",
            smtpPass: "",
            mailFrom: "noreply@localhost",
            jwtSecret: "test-secret",
            appUrl: "http://localhost:3000",
          }),
      })
    })

    describe("When a request is made with a valid email", () => {
      it(`should respond with an HTTP ${SEE_OTHER} redirect to /error`, () => {
        return request(app.getHttpServer())
          .post("/auth/register")
          .set("Accept", "text/html")
          .send({ email: faker.internet.email() })
          .expect(SEE_OTHER)
          .expect("Location", "/error")
      })
    })
  })
})
