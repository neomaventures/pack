/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports --
 * These rules are deliberately disabled: this spec exercises the fixture's
 * module-import-time behavior, which requires `require()` inside
 * `jest.isolateModules` callbacks and inline `import()` type queries to
 * preserve type safety across the isolated re-evaluations.
 */
import { faker } from "@faker-js/faker"

describe("@neomaventures/mockserver/fixture", () => {
  const originalUrl = process.env.MOCKSERVER_URL
  let originalBeforeEach: any

  beforeEach(() => {
    originalBeforeEach = (globalThis as any).beforeEach
  })

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.MOCKSERVER_URL
    } else {
      process.env.MOCKSERVER_URL = originalUrl
    }
    ;(globalThis as any).beforeEach = originalBeforeEach
    jest.resetModules()
    jest.unmock("./client")
  })

  describe("Given MOCKSERVER_URL is set", () => {
    it("should export a MockServerClient whose baseUrl matches the env var", () => {
      const url = faker.internet.url()
      process.env.MOCKSERVER_URL = url
      // Suppress the auto-registration noise during this test.
      ;(globalThis as any).beforeEach = jest.fn()

      let mod: typeof import("./fixture")
      let MockServerClientCtor: typeof import("./client").MockServerClient
      jest.isolateModules(() => {
        MockServerClientCtor = require("./client").MockServerClient
        mod = require("./fixture")
      })

      expect(mod!.mockserver).toBeInstanceOf(MockServerClientCtor!)
      expect(mod!.mockserver.baseUrl).toBe(url)
    })
  })

  describe("Given MOCKSERVER_URL is unset", () => {
    it("should throw at import time with a message naming the env var", () => {
      delete process.env.MOCKSERVER_URL

      expect(() => {
        jest.isolateModules(() => {
          require("./fixture")
        })
      }).toThrow(/MOCKSERVER_URL/)
    })

    it("should suggest the .env line in the error message", () => {
      delete process.env.MOCKSERVER_URL

      expect(() => {
        jest.isolateModules(() => {
          require("./fixture")
        })
      }).toThrow(/MOCKSERVER_URL=/)
    })
  })

  describe("Given MOCKSERVER_URL is an empty string", () => {
    it("should throw at import time", () => {
      process.env.MOCKSERVER_URL = ""

      expect(() => {
        jest.isolateModules(() => {
          require("./fixture")
        })
      }).toThrow(/MOCKSERVER_URL/)
    })
  })

  describe("Given a global beforeEach exists (Jest, Vitest, Playwright Test)", () => {
    it("should register a beforeEach hook that resets the client", async () => {
      process.env.MOCKSERVER_URL = faker.internet.url()
      const beforeEachSpy = jest.fn()
      ;(globalThis as any).beforeEach = beforeEachSpy
      const reset = jest.fn().mockResolvedValue(undefined)

      jest.isolateModules(() => {
        jest.doMock("./client", () => ({
          MockServerClient: jest.fn().mockImplementation((baseUrl: string) => ({
            baseUrl,
            reset,
          })),
        }))
        require("./fixture")
      })

      expect(beforeEachSpy).toHaveBeenCalledTimes(1)

      const callback = beforeEachSpy.mock.calls[0][0]
      await callback()

      expect(reset).toHaveBeenCalledTimes(1)
    })
  })

  describe("Given no global beforeEach exists", () => {
    it("should not throw at import time", () => {
      process.env.MOCKSERVER_URL = faker.internet.url()
      ;(globalThis as any).beforeEach = undefined

      expect(() => {
        jest.isolateModules(() => {
          require("./fixture")
        })
      }).not.toThrow()
    })
  })
})
