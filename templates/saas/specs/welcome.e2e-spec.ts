import { readFileSync } from "fs"
import { join } from "path"

import { HttpStatus, type INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import ejs from "ejs"
import request from "supertest"

import { configureViewEngine } from "~fixtures/configure-view-engine"
import { version } from "~fixtures/package-version"

import { ApplicationModule } from "~application/application.module"

const { OK } = HttpStatus

describe("GET /", () => {
  let app: INestApplication

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile()

    app = module.createNestApplication()
    configureViewEngine(app)
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  describe("When a request is made to the welcome page", () => {
    it(`should respond with HTTP ${OK} and the welcome template`, async () => {
      const template = readFileSync(
        join(process.cwd(), "views", "welcome.ejs"),
        "utf-8",
      )
      const expectedHtml = ejs.render(template, {
        appName: "__APP_NAME__",
        version,
      })

      await request(app.getHttpServer())
        .get("/")
        .expect(OK)
        .expect(expectedHtml)
    })
  })
})
