import { Module } from "@nestjs/common"
import { Test } from "@nestjs/testing"

import {
  MissingRequestContextError,
  RequestContextModule,
  getRequest,
} from "@neomaventures/request-context"

describe("RequestContextModule boot guard", () => {
  describe("Given a Nest app that imports RequestContextModule.forRoot()", () => {
    describe("When the app initialises", () => {
      it("should bootstrap without error", async () => {
        const module = await Test.createTestingModule({
          imports: [RequestContextModule.forRoot()],
        }).compile()

        const app = module.createNestApplication()

        await expect(app.init()).resolves.toBeDefined()

        await app.close()
      })

      it("should preserve the off-context getRequest() contract", async () => {
        const module = await Test.createTestingModule({
          imports: [RequestContextModule.forRoot()],
        }).compile()

        const app = module.createNestApplication()
        await app.init()

        expect(getRequest()).toBeUndefined()

        await app.close()
      })
    })
  })

  describe("Given a Nest app that wires RequestContextModule without forRoot()", () => {
    @Module({
      imports: [RequestContextModule],
    })
    class BrokenAppModule {}

    describe("When the app initialises", () => {
      it("should reject with MissingRequestContextError", async () => {
        const module = await Test.createTestingModule({
          imports: [BrokenAppModule],
        }).compile()

        const app = module.createNestApplication()

        await expect(app.init()).rejects.toBeInstanceOf(
          MissingRequestContextError,
        )

        await app.close().catch(() => {
          /* close may fail after a failed init; ignore */
        })
      })
    })
  })
})
