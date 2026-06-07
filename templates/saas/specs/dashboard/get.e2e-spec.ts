import { readFileSync } from "fs"
import { join } from "path"

import { HttpStatus } from "@nestjs/common"
import { managedAppInstance } from "@neomaventures/managed-app"
import ejs from "ejs"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"
import { npmPackageName, npmPackageVersion } from "~fixtures/package-version"

const { OK } = HttpStatus

const template = readFileSync(
  join(process.cwd(), "views", "dashboard.ejs"),
  "utf-8",
)

describe("GET /dashboard", () => {
  describe("When a request is made to the dashboard page", () => {
    it(`should respond with HTTP ${OK} and the dashboard template`, async () => {
      const app = await managedAppInstance({
        configure: configureViewEngine,
      })

      const expectedHtml = ejs.render(template, {
        npmPackageName,
        npmPackageVersion,
      })

      await request(app.getHttpServer())
        .get("/dashboard")
        .expect(OK)
        .expect(expectedHtml)
    })
  })
})
