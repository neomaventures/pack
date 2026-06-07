import { readFileSync } from "fs"
import { join } from "path"

import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import ejs from "ejs"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"
import { npmPackageName, npmPackageVersion } from "~fixtures/package-version"

const { OK } = HttpStatus

describe("GET /auth/register", () => {
  describe("When a request is made to the registration page", () => {
    it(`should respond with HTTP ${OK} and the register template`, async () => {
      const app = await managedAppInstance({
        configure: configureViewEngine,
      })

      const template = readFileSync(
        join(process.cwd(), "views", "auth", "register.ejs"),
        "utf-8",
      )
      const expectedHtml = ejs.render(template, {
        npmPackageName,
        npmPackageVersion,
      })

      await request(app.getHttpServer())
        .get("/auth/register")
        .expect(OK)
        .expect(expectedHtml)
    })
  })
})
