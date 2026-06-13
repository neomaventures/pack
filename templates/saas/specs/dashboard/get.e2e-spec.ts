import { readFileSync } from "fs"
import { join } from "path"

import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import ejs from "ejs"
import request from "supertest"

import { authenticate } from "~fixtures/auth/e2e"
import { configureViewEngine } from "~fixtures/configure-view-engine"
import { npmPackageName, npmPackageVersion } from "~fixtures/package-version"

const { OK, SEE_OTHER } = HttpStatus

const template = readFileSync(
  join(process.cwd(), "views", "dashboard.ejs"),
  "utf-8",
)

describe("GET /dashboard", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({
      configure: configureViewEngine,
    })
  })

  describe("When an unauthenticated request is made", () => {
    it(`should respond with an HTTP ${SEE_OTHER} redirect to /auth/register`, () => {
      return request(app.getHttpServer())
        .get("/dashboard")
        .set("Accept", "text/html")
        .expect(SEE_OTHER)
        .expect("Location", "/auth/register")
    })
  })

  describe("When an authenticated request is made", () => {
    const email = faker.internet.email()

    it(`should respond with HTTP ${OK} and the dashboard template with the user's email`, async () => {
      const cookie = await authenticate(app, email)

      const expectedHtml = ejs.render(
        template,
        {
          npmPackageName,
          npmPackageVersion,
          email: email.toLowerCase(),
        },
        { filename: join(process.cwd(), "views", "dashboard.ejs") },
      )

      await request(app.getHttpServer())
        .get("/dashboard")
        .set("Cookie", cookie)
        .expect(OK)
        .expect(expectedHtml)
    })
  })
})
