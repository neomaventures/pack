import { readFileSync } from "fs"
import { join } from "path"

import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import ejs from "ejs"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"
import { npmPackageName, npmPackageVersion } from "~fixtures/package-version"

const { BAD_REQUEST, OK } = HttpStatus

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

describe("POST /signup", () => {
  describe("Given an invalid email", () => {
    it(`should respond with HTTP ${BAD_REQUEST} and re-render the signup form with an error message`, async () => {
      const app = await managedAppInstance({
        configure: configureViewEngine,
      })

      const invalidEmail = faker.string.alpha(10)

      const response = await request(app.getHttpServer())
        .post("/signup")
        .send({ email: invalidEmail })
        .set("Accept", "text/html")
        .expect(BAD_REQUEST)

      expect(response.headers["content-type"]).toMatch(/text\/html/)
      expect(response.text).toContain("Sign up")
      expect(response.text).toContain(invalidEmail)
      expect(response.text).toContain("email must be an email")
    })
  })

  describe("Given an empty body", () => {
    it(`should respond with HTTP ${BAD_REQUEST} and re-render the signup form with an error message`, async () => {
      const app = await managedAppInstance({
        configure: configureViewEngine,
      })

      const response = await request(app.getHttpServer())
        .post("/signup")
        .send({})
        .set("Accept", "text/html")
        .expect(BAD_REQUEST)

      expect(response.headers["content-type"]).toMatch(/text\/html/)
      expect(response.text).toContain("Sign up")
    })
  })

  describe("Given a valid email", () => {
    it("should redirect to /", async () => {
      const app = await managedAppInstance({
        configure: configureViewEngine,
      })

      await request(app.getHttpServer())
        .post("/signup")
        .send({ email: faker.internet.email() })
        .expect(HttpStatus.FOUND)
        .expect("Location", "/")
    })
  })
})
