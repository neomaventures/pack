import { faker } from "@faker-js/faker"
import { ContextIdFactory } from "@nestjs/core"
import { Test } from "@nestjs/testing"
import type { Request } from "express"
import { express } from "fixtures/express"

import {
  FEATURES_OPTIONS,
  type FeaturesModuleOptions,
} from "../features.options"

import { FeaturesService } from "./features.service"

/**
 * Resolve a request-scoped `FeaturesService` through Nest's testing
 * module. We build a testing module with `FeaturesService` registered and
 * `FEATURES_OPTIONS` provided as a value, then bind a fake express request
 * to a fresh `ContextId` so `moduleRef.resolve` yields a per-test instance
 * wired with the same request the resolver will see.
 */
async function resolveService(
  options: FeaturesModuleOptions = {},
  req: Request = express.request() as unknown as Request,
): Promise<FeaturesService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      FeaturesService,
      { provide: FEATURES_OPTIONS, useValue: options },
    ],
  }).compile()

  const contextId = ContextIdFactory.create()
  moduleRef.registerRequestByContextId(req, contextId)

  return moduleRef.resolve(FeaturesService, contextId)
}

describe("FeaturesService", () => {
  describe("Given a static flag map where the flag is strictly true", () => {
    describe("When isEnabled is called for that flag", () => {
      it("Then it resolves true and does not invoke the resolver", async () => {
        const name = faker.string.alpha(8).toUpperCase()
        const resolve = jest.fn()
        const service = await resolveService({
          flags: { [name]: true },
          resolve,
        })

        await expect(service.isEnabled(name)).resolves.toBe(true)
        expect(resolve).not.toHaveBeenCalled()
      })
    })
  })

  describe("Given a static flag map where the flag is false and no resolver is configured", () => {
    describe("When isEnabled is called for that flag", () => {
      it("Then it resolves false", async () => {
        const name = faker.string.alpha(8).toUpperCase()
        const service = await resolveService({ flags: { [name]: false } })

        await expect(service.isEnabled(name)).resolves.toBe(false)
      })
    })
  })

  describe("Given a resolver that admits the flag", () => {
    describe("When isEnabled is called and no static flag is set", () => {
      it("Then it resolves true", async () => {
        const name = faker.string.alpha(8).toUpperCase()
        const service = await resolveService({
          resolve: async () => ({ [name]: true }),
        })

        await expect(service.isEnabled(name)).resolves.toBe(true)
      })
    })
  })

  describe("Given a resolver that denies the flag", () => {
    describe("When isEnabled is called and no static flag is set", () => {
      it("Then it resolves false", async () => {
        const name = faker.string.alpha(8).toUpperCase()
        const service = await resolveService({
          resolve: async () => ({ [name]: false }),
        })

        await expect(service.isEnabled(name)).resolves.toBe(false)
      })
    })
  })

  describe("Given flags deny the flag but the resolver admits", () => {
    describe("When isEnabled is called", () => {
      it("Then the union admits and it resolves true", async () => {
        const name = faker.string.alpha(8).toUpperCase()
        const service = await resolveService({
          flags: { [name]: false },
          resolve: async () => ({ [name]: true }),
        })

        await expect(service.isEnabled(name)).resolves.toBe(true)
      })
    })
  })

  describe("Given flags admit the flag and a resolver is also configured", () => {
    describe("When isEnabled is called", () => {
      it("Then it short-circuits and does not invoke the resolver", async () => {
        const name = faker.string.alpha(8).toUpperCase()
        const resolve = jest.fn().mockResolvedValue({ [name]: false })
        const service = await resolveService({
          flags: { [name]: true },
          resolve,
        })

        await expect(service.isEnabled(name)).resolves.toBe(true)
        expect(resolve).not.toHaveBeenCalled()
      })
    })
  })

  describe("Given a resolver that rejects", () => {
    describe("When isEnabled is called", () => {
      it("Then the rejection propagates unchanged", async () => {
        const name = faker.string.alpha(8).toUpperCase()
        const boom = new Error(faker.lorem.sentence())
        const service = await resolveService({
          resolve: async () => {
            throw boom
          },
        })

        await expect(service.isEnabled(name)).rejects.toBe(boom)
      })
    })
  })

  describe("Given a resolver and a DI-bound request", () => {
    describe("When isEnabled is called", () => {
      it("Then the resolver is invoked with the same Request reference", async () => {
        const name = faker.string.alpha(8).toUpperCase()
        const req = express.request() as unknown as Request
        const resolve = jest.fn().mockResolvedValue({ [name]: true })
        const service = await resolveService({ resolve }, req)

        await service.isEnabled(name)

        expect(resolve).toHaveBeenCalledTimes(1)
        expect(resolve.mock.calls[0][0]).toBe(req)
      })
    })
  })

  describe("Given a resolver that returns the flag", () => {
    describe("When isEnabled is called twice", () => {
      it("Then the resolver is invoked once per call (no memoisation)", async () => {
        const name = faker.string.alpha(8).toUpperCase()
        const resolve = jest.fn().mockResolvedValue({ [name]: true })
        const service = await resolveService({ resolve })

        await service.isEnabled(name)
        await service.isEnabled(name)

        expect(resolve).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe("Given non-strict-true values on the static and resolver paths", () => {
    const nonStrictCases: Array<[string, unknown]> = [
      ["the string 'true'", "true"],
      ["the number 1", 1],
      ["an empty object", {}],
    ]

    nonStrictCases.forEach(([label, value]) => {
      describe(`When the flag is ${label} in the static map`, () => {
        it("Then isEnabled resolves false (strict === true required)", async () => {
          const name = faker.string.alpha(8).toUpperCase()
          const service = await resolveService({
            flags: { [name]: value } as unknown as Record<string, boolean>,
          })

          await expect(service.isEnabled(name)).resolves.toBe(false)
        })
      })

      describe(`When the resolver returns ${label} for the flag`, () => {
        it("Then isEnabled resolves false (strict === true required)", async () => {
          const name = faker.string.alpha(8).toUpperCase()
          const service = await resolveService({
            resolve: async () =>
              ({ [name]: value }) as unknown as Record<string, boolean>,
          })

          await expect(service.isEnabled(name)).resolves.toBe(false)
        })
      })
    })
  })

  describe("Given no options configured at all", () => {
    describe("When isEnabled is called", () => {
      it("Then it resolves false without throwing", async () => {
        const name = faker.string.alpha(8).toUpperCase()
        const service = await resolveService({})

        await expect(service.isEnabled(name)).resolves.toBe(false)
      })
    })
  })
})
