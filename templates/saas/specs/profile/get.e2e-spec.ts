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
  join(process.cwd(), "views", "profile.ejs"),
  "utf-8",
)

describe("GET /profile", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({
      configure: configureViewEngine,
    })
  })

  describe("When an unauthenticated request is made", () => {
    it(`should respond with an HTTP ${SEE_OTHER} redirect to /auth/register`, () => {
      return request(app.getHttpServer())
        .get("/profile")
        .set("Accept", "text/html")
        .expect(SEE_OTHER)
        .expect("Location", "/auth/register")
    })
  })

  describe("When an authenticated request is made", () => {
    const email = faker.internet.email()

    it(`should respond with HTTP ${OK} and the profile template`, async () => {
      const cookie = await authenticate(app, email)

      // The authenticated user has no Google OAuth token, so the mailbox
      // interceptor's accessor throws `GmailNotConnectedException` and the
      // route-level @ErrorTemplate maps that to a 200 re-render of the
      // profile template with `exception` populated by the filter.
      const expectedHtml = ejs.render(
        template,
        {
          npmPackageName,
          npmPackageVersion,
          connectedAccounts: [],
          exception: {
            statusCode: OK,
            message: "Gmail is not connected.",
            error: "GmailNotConnected",
          },
        },
        { filename: join(process.cwd(), "views", "profile.ejs") },
      )

      await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)
        .expect(expectedHtml)
    })
  })
})
