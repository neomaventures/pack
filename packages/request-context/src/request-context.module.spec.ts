import { Test, type TestingModule } from "@nestjs/testing"

import { MissingRequestContextError } from "./exceptions/missing-request-context.exception"
import { RequestContextModule } from "./request-context.module"

describe("RequestContextModule", () => {
  describe("Given the module is imported via forRoot()", () => {
    let module: TestingModule

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [RequestContextModule.forRoot()],
      }).compile()
    })

    afterEach(async () => {
      await module.close()
    })

    describe("When the application initialises", () => {
      it("should not throw at onApplicationBootstrap", async () => {
        await expect(module.init()).resolves.toBeDefined()
      })
    })
  })

  describe("Given the module class is instantiated without forRoot()", () => {
    describe("When onApplicationBootstrap runs without the marker provider", () => {
      it("should throw MissingRequestContextError", () => {
        const instance = new RequestContextModule(undefined)

        expect(() => instance.onApplicationBootstrap()).toThrow(
          MissingRequestContextError,
        )
      })
    })

    describe("When the marker is anything other than true", () => {
      it("should throw MissingRequestContextError", () => {
        const instance = new RequestContextModule(
          // @ts-expect-error - simulating a corrupted marker value
          false,
        )

        expect(() => instance.onApplicationBootstrap()).toThrow(
          MissingRequestContextError,
        )
      })
    })
  })
})
