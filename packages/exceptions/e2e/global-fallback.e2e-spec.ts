import { readFileSync } from "fs"
import { join } from "path"

import { managedAppInstance } from "@neomaventures/managed-app"
import { HttpStatus } from "@nestjs/common"
import { type NestExpressApplication } from "@nestjs/platform-express"
import * as ejs from "ejs"
import request from "supertest"

const viewsDir = join(__dirname, "app", "views")

const globalDefaultTemplate = readFileSync(
  join(viewsDir, "global-default.ejs"),
  "utf-8",
)
const global404Template = readFileSync(
  join(viewsDir, "global-404.ejs"),
  "utf-8",
)
const global500Template = readFileSync(
  join(viewsDir, "global-500.ejs"),
  "utf-8",
)
const routeTemplate = readFileSync(
  join(viewsDir, "route-template.ejs"),
  "utf-8",
)

const configureViewEngine = (app: any): void => {
  const expressApp = app as unknown as NestExpressApplication
  expressApp.setBaseViewsDir(viewsDir)
  expressApp.setViewEngine("ejs")
}

describe("Global fallback templates", () => {
  describe("Given forRoot({ errorTemplates })", () => {
    let app: Awaited<ReturnType<typeof managedAppInstance>>

    beforeEach(async () => {
      app = await managedAppInstance({
        module: "e2e/app/global-fallback.module.ts#GlobalFallbackModule",
        configure: configureViewEngine,
      })
    })

    describe("When middleware throws a NotFoundException with Accept: text/html", () => {
      it("should render the status-keyed global-404 template", async () => {
        const exception = {
          statusCode: HttpStatus.NOT_FOUND,
          message: "missing",
          error: "Not Found",
        }
        const expectedHtml = ejs.render(global404Template, { exception })

        await request(app.getHttpServer())
          .get("/middleware-throws")
          .set("Accept", "text/html")
          .expect(HttpStatus.NOT_FOUND)
          .expect(expectedHtml)
      })
    })

    describe("When middleware throws an unhandled Error with Accept: text/html", () => {
      it("should render the status-keyed global-500 template using the normalised 500 status", async () => {
        const exception = {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Internal server error",
          error: "Internal Server Error",
        }
        const expectedHtml = ejs.render(global500Template, { exception })

        await request(app.getHttpServer())
          .get("/middleware-throws-unknown")
          .set("Accept", "text/html")
          .expect(HttpStatus.INTERNAL_SERVER_ERROR)
          .expect(expectedHtml)
      })
    })

    describe("When a route with @ErrorTemplate throws", () => {
      it("should render the route-level template, ignoring the global fallback", async () => {
        const exception = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: "Bad request",
          error: "Bad Request",
        }
        const expectedHtml = ejs.render(routeTemplate, { exception })

        await request(app.getHttpServer())
          .post("/with-route-template")
          .set("Accept", "text/html")
          .expect(HttpStatus.BAD_REQUEST)
          .expect(expectedHtml)
      })
    })

    describe("When an exception declares getRedirect()", () => {
      it("should redirect, ignoring both route and global templates", async () => {
        await request(app.getHttpServer())
          .post("/with-redirect")
          .set("Accept", "text/html")
          .expect(HttpStatus.SEE_OTHER)
          .expect("Location", "/login")
      })
    })

    describe("When the request accepts application/json", () => {
      it("should respond with JSON regardless of errorTemplates", async () => {
        await request(app.getHttpServer())
          .get("/middleware-throws")
          .set("Accept", "application/json")
          .expect(HttpStatus.NOT_FOUND)
          .expect("Content-Type", /json/)
      })
    })

    describe("Given a status-keyed entry starts with /", () => {
      it("should issue a 303 See Other redirect for that status", async () => {
        await request(app.getHttpServer())
          .post("/teapot")
          .set("Accept", "text/html")
          .expect(HttpStatus.SEE_OTHER)
          .expect("Location", "/teapot")
      })
    })

    describe("When the global default template is used", () => {
      it("should render global-default when no status-keyed entry matches", async () => {
        const exception = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: "Bad request",
          error: "Bad Request",
        }
        const expectedHtml = ejs.render(globalDefaultTemplate, { exception })

        await request(app.getHttpServer())
          .post("/plain-bad-request")
          .set("Accept", "text/html")
          .expect(HttpStatus.BAD_REQUEST)
          .expect(expectedHtml)
      })
    })
  })
})
