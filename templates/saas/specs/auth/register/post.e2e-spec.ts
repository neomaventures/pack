import { readFileSync } from "fs"
import { join } from "path"

import { faker } from "@faker-js/faker"
import { ConfigService } from "@neomaventures/config"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import ejs from "ejs"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"
import { mailpit } from "~fixtures/email/mailpit"
import { npmPackageName, npmPackageVersion } from "~fixtures/package-version"

const { BAD_REQUEST, FOUND, SEE_OTHER } = HttpStatus

const registerTemplate = readFileSync(
  join(process.cwd(), "views", "auth", "register.ejs"),
  "utf-8",
)

describe("POST /auth/register", () => {
  describe("Given the magic link service is operational", () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>

    beforeEach(async () => {
      app = await managedAppInstance({
        configure: configureViewEngine,
      })
    })

    describe("Given an invalid email", () => {
      it(`should respond with HTTP ${BAD_REQUEST} and re-render the form with the error`, async () => {
        const invalidEmail = faker.string.alpha(10)

        const expectedHtml = ejs.render(registerTemplate, {
          npmPackageName,
          npmPackageVersion,
          exception: {
            email: {
              value: invalidEmail,
              error: "Please enter a valid email address.",
            },
          },
        })

        await request(app.getHttpServer())
          .post("/auth/register")
          .send({ email: invalidEmail })
          .set("Accept", "text/html")
          .expect(BAD_REQUEST)
          .expect(expectedHtml)
      })
    })

    describe("Given an empty body", () => {
      it(`should respond with HTTP ${BAD_REQUEST} and re-render the form with the error`, async () => {
        const expectedHtml = ejs.render(registerTemplate, {
          npmPackageName,
          npmPackageVersion,
          exception: {
            email: {
              value: undefined,
              error: "Please enter your email address.",
            },
          },
        })

        await request(app.getHttpServer())
          .post("/auth/register")
          .send({})
          .set("Accept", "text/html")
          .expect(BAD_REQUEST)
          .expect(expectedHtml)
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

      it("should send a magic link email with a callback URL", async () => {
        await request(app.getHttpServer())
          .post("/auth/register")
          .send({ email })

        const message = await mailpit.findByRecipient(email)

        expect(message.Subject).toMatch(/welcome/i)
        expect(message.HTML).toContain("/auth/magic-link/callback?token=")
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
            databaseUri: ":memory:",
            smtpHost: "localhost",
            smtpPort: "19999",
            smtpUser: "",
            smtpPass: "",
            mailFrom: faker.internet.email(),
            jwtSecret: faker.string.alphanumeric(32),
            appUrl: faker.internet.url(),
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
