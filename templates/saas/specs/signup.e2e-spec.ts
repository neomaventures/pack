import { readFileSync } from "fs"
import { join } from "path"

import { HttpStatus } from "@nestjs/common"
import { managedAppInstance } from "@neomaventures/managed-app"
import ejs from "ejs"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"
import { npmPackageName, npmPackageVersion } from "~fixtures/package-version"

const { OK } = HttpStatus

describe("GET /signup", () => {
  describe("When a request is made to the sign up page", () => {
    it(`should respond with HTTP ${OK} and the signup template`, async () => {
      const app = await managedAppInstance({
        configure: configureViewEngine,
      })

      const template = readFileSync(
        join(process.cwd(), "views", "signup.ejs"),
        "utf-8",
      )
      const expectedHtml = ejs.render(template, {
        npmPackageName,
        npmPackageVersion,
      })

      await request(app.getHttpServer())
        .get("/signup")
        .expect(OK)
        .expect(expectedHtml)
    })
  })
})
