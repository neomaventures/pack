import { readFileSync } from "fs"
import { join } from "path"

import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import ejs from "ejs"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"
import { npmPackageName, npmPackageVersion } from "~fixtures/package-version"

const { OK } = HttpStatus

const expiredTemplate = readFileSync(
  join(process.cwd(), "views", "auth", "magic-link", "expired.ejs"),
  "utf-8",
)

describe("GET /auth/magic-link/expired", () => {
  describe("When a visitor navigates to the expired page", () => {
    it(`should respond with HTTP ${OK} and the expired template`, async () => {
      const app = await managedAppInstance({
        configure: configureViewEngine,
      })

      const expectedHtml = ejs.render(expiredTemplate, {
        npmPackageName,
        npmPackageVersion,
      })

      await request(app.getHttpServer())
        .get("/auth/magic-link/expired")
        .expect(OK)
        .expect(expectedHtml)
    })
  })
})
