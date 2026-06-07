import { readFileSync } from "fs"
import { join } from "path"

import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import ejs from "ejs"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"
import { npmPackageName, npmPackageVersion } from "~fixtures/package-version"

const { OK, SEE_OTHER } = HttpStatus
const template = readFileSync(
  join(process.cwd(), "views", "auth", "magic-link-sent.ejs"),
  "utf-8",
)

const email = faker.internet.email()

describe("GET /auth/magic-link/sent", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({
      configure: configureViewEngine,
    })
  })

  describe(`When a request is made with the email address ${email}`, () => {
    it(`should respond with HTTP ${OK} and the magic-link-sent template`, async () => {
      const expectedHtml = ejs.render(template, {
        npmPackageName,
        npmPackageVersion,
        email,
      })

      await request(app.getHttpServer())
        .get("/auth/magic-link/sent")
        .query({ email })
        .expect(OK)
        .expect(expectedHtml)
    })
  })

  describe("When a request is made with an invalid email", () => {
    it(`should respond with an HTTP ${SEE_OTHER} redirect to /auth/register`, () => {
      return request(app.getHttpServer())
        .get("/auth/magic-link/sent")
        .query({ email: "not-an-email" })
        .set("Accept", "text/html")
        .expect(SEE_OTHER)
        .expect("Location", "/auth/register")
    })
  })
})
