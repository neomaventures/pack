import { faker } from "@faker-js/faker"
import { Test } from "@nestjs/testing"
import { type Request, type Response } from "express"

import { type ArgosOptions, ARGOS_OPTIONS } from "../argos.options"
import { auditStore } from "../argos.store"

import { ActorMiddleware } from "./actor.middleware"

const mockRequest = (headers: Record<string, string> = {}): Request =>
  ({ headers }) as unknown as Request

const mockResponse = (): Response => ({}) as unknown as Response

const buildMiddleware = async (
  options: ArgosOptions,
): Promise<ActorMiddleware> => {
  const module = await Test.createTestingModule({
    providers: [{ provide: ARGOS_OPTIONS, useValue: options }, ActorMiddleware],
  }).compile()

  return module.get(ActorMiddleware)
}

describe("ActorMiddleware", () => {
  describe("Given resolveActor resolves an actor", () => {
    let middleware: ActorMiddleware
    const actor = `principal:${faker.string.uuid()}`

    beforeAll(async () => {
      middleware = await buildMiddleware({
        defaultActor: "system",
        resolveActor: () => actor,
      })
    })

    it("should store the resolved actor in ALS", async () => {
      let storedActor: string | undefined
      await middleware.use(mockRequest(), mockResponse(), () => {
        storedActor = auditStore.getStore()?.actor
      })

      expect(storedActor).toBe(actor)
    })
  })

  describe("Given resolveActor is a spy", () => {
    let middleware: ActorMiddleware
    const resolveActor = jest.fn().mockReturnValue("system")

    beforeAll(async () => {
      middleware = await buildMiddleware({
        defaultActor: "system",
        resolveActor,
      })
    })

    it("should call resolveActor with the request", async () => {
      const req = mockRequest({ "x-actor": "principal:abc" })

      await middleware.use(req, mockResponse(), () => {})

      expect(resolveActor).toHaveBeenCalledWith(req)
    })
  })

  describe("Given resolveActor returns null", () => {
    let middleware: ActorMiddleware

    beforeAll(async () => {
      middleware = await buildMiddleware({
        defaultActor: "system",
        resolveActor: () => null,
      })
    })

    it("should fall back to defaultActor", async () => {
      let storedActor: string | undefined
      await middleware.use(mockRequest(), mockResponse(), () => {
        storedActor = auditStore.getStore()?.actor
      })

      expect(storedActor).toBe("system")
    })
  })

  describe("Given resolveActor returns null with a custom defaultActor", () => {
    let middleware: ActorMiddleware
    const defaultActor = `webhook:${faker.word.noun()}`

    beforeAll(async () => {
      middleware = await buildMiddleware({
        defaultActor,
        resolveActor: () => null,
      })
    })

    it("should fall back to the custom defaultActor", async () => {
      let storedActor: string | undefined
      await middleware.use(mockRequest(), mockResponse(), () => {
        storedActor = auditStore.getStore()?.actor
      })

      expect(storedActor).toBe(defaultActor)
    })
  })

  describe("Given resolveActor is async", () => {
    let middleware: ActorMiddleware
    const actor = `api:${faker.word.noun()}`

    beforeAll(async () => {
      middleware = await buildMiddleware({
        defaultActor: "system",
        resolveActor: async () => actor,
      })
    })

    it("should store the resolved actor in ALS", async () => {
      let storedActor: string | undefined
      await middleware.use(mockRequest(), mockResponse(), () => {
        storedActor = auditStore.getStore()?.actor
      })

      expect(storedActor).toBe(actor)
    })
  })

  describe("Given no resolveActor is defined", () => {
    let middleware: ActorMiddleware

    beforeAll(async () => {
      middleware = await buildMiddleware({ defaultActor: "system" })
    })

    it("should store defaultActor in ALS", async () => {
      let storedActor: string | undefined
      await middleware.use(mockRequest(), mockResponse(), () => {
        storedActor = auditStore.getStore()?.actor
      })

      expect(storedActor).toBe("system")
    })
  })

  describe("Given no resolveActor and a custom defaultActor", () => {
    let middleware: ActorMiddleware
    const defaultActor = `cron:${faker.word.noun()}`

    beforeAll(async () => {
      middleware = await buildMiddleware({ defaultActor })
    })

    it("should store the custom defaultActor in ALS", async () => {
      let storedActor: string | undefined
      await middleware.use(mockRequest(), mockResponse(), () => {
        storedActor = auditStore.getStore()?.actor
      })

      expect(storedActor).toBe(defaultActor)
    })
  })
})
