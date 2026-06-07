import { readFileSync } from "fs"
import { join } from "path"

import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import ejs from "ejs"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"
import { npmPackageName, npmPackageVersion } from "~fixtures/package-version"

const { BAD_REQUEST, FOUND, OK } = HttpStatus

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

describe("POST /auth/register", () => {
  describe("Given an invalid email", () => {
    it(`should respond with HTTP ${BAD_REQUEST} and re-render the form with an error`, async () => {
      const app = await managedAppInstance({
        configure: configureViewEngine,
      })

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
      const app = await managedAppInstance({
        configure: configureViewEngine,
      })

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
    it(`should redirect to /`, async () => {
      const app = await managedAppInstance({
        configure: configureViewEngine,
      })

      await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email: faker.internet.email() })
        .expect(FOUND)
        .expect("Location", "/")
    })
  })
})
