import { faker } from "@faker-js/faker"
import { MailpitClient } from "@neomaventures/mailpit"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import { credentials } from "fixtures/fakes/credentials"
import * as jwt from "jsonwebtoken"
import request from "supertest"
import { DataSource } from "typeorm"

const { ACCEPTED, BAD_REQUEST } = HttpStatus
const FIFTEEN_MINUTES = 900
const mailpit = new MailpitClient(process.env.MAILPIT_API!)

const appModules: [string, string][] = [
  ["forRoot", "e2e/app/core/app.module.ts#AppModule"],
  ["forRootAsync", "e2e/app/core/app.async.module.ts#AsyncAppModule"],
]

appModules.forEach(([name, modulePath]) => {
  describe(`POST /magic-link (${name})`, () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>

    beforeEach(async () => {
      app = await managedAppInstance(modulePath)
    })

    afterEach(() => {
      return mailpit.clear()
    })

    describe("When a request is made with a new email", () => {
      it(`should respond with HTTP ${ACCEPTED} and send a welcome email`, async () => {
        const email = faker.internet.email()

        const issuedAtMin = Math.floor(Date.now() / 1000)
        await request(app.getHttpServer())
          .post("/magic-link")
          .send({ email })
          .expect(ACCEPTED)
        const issuedAtMax = Math.floor(Date.now() / 1000)

        const { messages } = await mailpit.messages()
        const message = await mailpit.message(messages[0].ID as string)

        // Sent from correct email
        expect(message.From.Address.toLowerCase()).toBe(
          process.env.MAGIC_LINK_FROM!.toLowerCase(),
        )

        // Sent to correct email
        expect(message.To[0].Address.toLowerCase()).toBe(email.toLowerCase())

        // Uses the welcome (registration) subject
        expect(message.Subject).toBe(process.env.MAGIC_LINK_WELCOME_SUBJECT!)

        // Uses the welcome template
        expect(message.Text).toInclude("Sign up")

        // Includes the correct url with token query parameter.
        const verificationUrl = message.Text.match(
          /[a-z]+[:.].*?(?=\s)/,
        )![0] as string

        // Base url is correct
        expect(verificationUrl).toContain(process.env.APP_URL!)

        const token = verificationUrl.substring(
          verificationUrl.indexOf("=") + 1,
        )

        // Verify correct signature.
        const details = jwt.verify(token, process.env.AUTH_SECRET!) as Record<
          string,
          any
        >

        // Sent to the correct email address.
        expect(details.email).toBe(email)

        // Has correct audience.
        expect(details.aud).toBe("magic-link")

        // Has correct iat and exp claims. Token is issued at some point
        // between the request being made and the response returning, so
        // iat may fall on either side of a second boundary.
        expect(details.iat).toBeGreaterThanOrEqual(issuedAtMin)
        expect(details.iat).toBeLessThanOrEqual(issuedAtMax)
        expect(details.exp).toEqual(details.iat + FIFTEEN_MINUTES)
      })
    })

    describe("When a request is made with an existing email", () => {
      it(`should respond with HTTP ${ACCEPTED} and send a welcome back email`, async () => {
        const email = faker.internet.email().toLowerCase()

        // Pre-create the user
        const datasource = app.get(DataSource)
        const repo = datasource.getRepository("Account")
        const user = repo.create({ email })
        await repo.save(user)

        const issuedAtMin = Math.floor(Date.now() / 1000)
        await request(app.getHttpServer())
          .post("/magic-link")
          .send({ email })
          .expect(ACCEPTED)
        const issuedAtMax = Math.floor(Date.now() / 1000)

        const { messages } = await mailpit.messages()
        const message = await mailpit.message(messages[0].ID as string)

        // Sent from correct email
        expect(message.From.Address.toLowerCase()).toBe(
          process.env.MAGIC_LINK_FROM!.toLowerCase(),
        )

        // Sent to correct email
        expect(messages[0].To[0].Address.toLowerCase()).toBe(
          email.toLowerCase(),
        )

        // Uses the welcomeBack (login) subject
        expect(messages[0].Subject).toBe(
          process.env.MAGIC_LINK_WELCOME_BACK_SUBJECT!,
        )

        // Uses the welcomeBack template
        expect(message.Text).toInclude("Sign in")

        // Includes the correct url with token query parameter.
        const verificationUrl = message.Text.match(
          /[a-z]+[:.].*?(?=\s)/,
        )![0] as string

        // Base url is correct
        expect(verificationUrl).toContain(process.env.APP_URL!)

        const token = verificationUrl.substring(
          verificationUrl.indexOf("=") + 1,
        )

        // Verify correct signature.
        const details = jwt.verify(token, process.env.AUTH_SECRET!) as Record<
          string,
          any
        >

        // Sent to the correct email address.
        expect(details.email).toBe(email)

        // Has correct audience.
        expect(details.aud).toBe("magic-link")

        // Has correct iat and exp claims. Token is issued at some point
        // between the request being made and the response returning, so
        // iat may fall on either side of a second boundary.
        expect(details.iat).toBeGreaterThanOrEqual(issuedAtMin)
        expect(details.iat).toBeLessThanOrEqual(issuedAtMax)
        expect(details.exp).toEqual(details.iat + FIFTEEN_MINUTES)
      })
    })

    credentials.invalidEmails().forEach((email) => {
      describe(`When it's called with the invalid email ${email}`, () => {
        it(`Then it should respond with an HTTP ${BAD_REQUEST}`, () => {
          return request(app.getHttpServer())
            .post("/magic-link")
            .send({ email })
            .expect(BAD_REQUEST)
            .expect({
              message: ["Please enter a valid email address."],
              error: "Bad Request",
              statusCode: 400,
            })
        })
      })
    })

    describe("When it's called with a blank email address", () => {
      it(`Then it should respond with an HTTP ${BAD_REQUEST}`, () => {
        return request(app.getHttpServer())
          .post("/magic-link")
          .send({ email: "" })
          .expect(BAD_REQUEST)
          .expect({
            message: ["Please enter your email address."],
            error: "Bad Request",
            statusCode: 400,
          })
      })
    })

    describe("When it's called without an email address", () => {
      it(`Then it should respond with an HTTP ${BAD_REQUEST}`, () => {
        return request(app.getHttpServer())
          .post("/magic-link")
          .send({})
          .expect(BAD_REQUEST)
          .expect({
            message: ["Please enter your email address."],
            error: "Bad Request",
            statusCode: 400,
          })
      })
    })
  })
})
