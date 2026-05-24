import { resolve } from "path"

import { managedAppInstance } from "@neoma/managed-app"
import { HttpStatus, type INestApplication } from "@nestjs/common"
import request from "supertest"
import { type App } from "supertest/types"

import {
  createSandbox,
  placeDefaultModule,
  type Sandbox,
} from "../support/sandbox"

const LOCATION = "src/application/application.module.ts"
const MODULE = "ApplicationModule"

let sandbox: Sandbox

afterEach(() => {
  sandbox.cleanup()
  // The default module file is copied/replaced across tests, so clear Node's
  // module cache to avoid serving a stale version from a previous test.
  jest.resetModules()
})

describe(LOCATION, () => {
  describe(`When there is a module at ${LOCATION} with the export ${MODULE}`, () => {
    let app: INestApplication<App>
    beforeEach(async () => {
      sandbox = createSandbox()
      placeDefaultModule(sandbox, "bak.application.module.ts")
      app = await managedAppInstance()
    })

    it("it should automatically load the module.", () => {
      return request(app.getHttpServer())
        .get("/message")
        .expect(HttpStatus.OK)
        .expect({ message: `Hello from ${LOCATION}#${MODULE}` })
    })

    it("it should return the same instance upon successive calls", async () => {
      const app2 = await managedAppInstance()
      expect(app).toBe(app2)
    })
  })

  describe(`When there is a module at ${LOCATION} but the export is not called ${MODULE}`, () => {
    beforeEach(() => {
      sandbox = createSandbox()
      placeDefaultModule(sandbox, "bak.application#app.module.ts")
    })

    it("it should throw an error.", () => {
      return expect(managedAppInstance()).rejects.toThrow(
        `${LOCATION} module found but it is missing an export named ${MODULE}. Please ensure a module exists at ${resolve(LOCATION)} with the named import ${MODULE}.`,
      )
    })
  })

  describe("When the default module throws an error while being imported", () => {
    beforeEach(() => {
      sandbox = createSandbox()
      placeDefaultModule(sandbox, "bak.error.module.ts")
    })

    it("it should throw an error", () => {
      return expect(managedAppInstance()).rejects.toThrow(
        `${LOCATION} module found but an error occured whilst importing. Error: This is a deliberate error in the module`,
      )
    })
  })

  describe(`When there is not a module at ${LOCATION}`, () => {
    beforeEach(() => {
      sandbox = createSandbox()
    })

    it("it should throw an error.", () => {
      return expect(managedAppInstance()).rejects.toThrow(
        `${LOCATION}#${MODULE} module not found. Please ensure a module exists at ${resolve(LOCATION)} with the named import ${MODULE}.`,
      )
    })
  })
})
