import { faker } from "@faker-js/faker"
import { Test, type TestingModule } from "@nestjs/testing"

import { PROBE_TIMEOUT_MS } from "../healthcheck.constants"
import {
  HEALTHCHECK_OPTIONS,
  type HealthcheckOptions,
} from "../healthcheck.options"

import { type ProbeConfig } from "./probe-config"
import { ProbeRunnerService } from "./probe-runner.service"

async function createRunner(
  options: HealthcheckOptions,
): Promise<{ runner: ProbeRunnerService; module: TestingModule }> {
  const module = await Test.createTestingModule({
    providers: [
      ProbeRunnerService,
      { provide: HEALTHCHECK_OPTIONS, useValue: options },
    ],
  }).compile()
  const runner = module.get<ProbeRunnerService>(ProbeRunnerService)
  return { runner, module }
}

describe("ProbeRunnerService", () => {
  let fetchSpy: jest.SpiedFunction<typeof globalThis.fetch>

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, "fetch")
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    jest.useRealTimers()
  })

  describe("run()", () => {
    describe("Given options.probes is empty", () => {
      it("should return undefined", async () => {
        const { runner } = await createRunner({ probes: [] })

        await expect(runner.run()).resolves.toBeUndefined()
      })
    })

    describe("Given a single HTTP probe and the upstream returns 200", () => {
      it("should return { name: { ok: true, latencyMs } }", async () => {
        const name = faker.lorem.word()
        const url = faker.internet.url()
        fetchSpy.mockResolvedValue(
          new Response("ok", { status: 200 }) as Response,
        )

        const { runner } = await createRunner({ probes: [{ name, url }] })
        const result = await runner.run()

        expect(result).toBeDefined()
        expect(result![name].ok).toBe(true)
        expect(typeof result![name].latencyMs).toBe("number")
        expect(result![name].error).toBeUndefined()
      })
    })

    describe("Given an HTTP probe with expect.status = 204 and upstream returns 204", () => {
      it("should return ok: true", async () => {
        const name = faker.lorem.word()
        const url = faker.internet.url()
        fetchSpy.mockResolvedValue(
          new Response(null, { status: 204 }) as Response,
        )

        const { runner } = await createRunner({
          probes: [{ name, url, expect: { status: 204 } }],
        })
        const result = await runner.run()

        expect(result![name].ok).toBe(true)
      })
    })

    describe("Given an HTTP probe with expect.status = 200 and upstream returns 503", () => {
      it("should return ok: false with 'Expected 200, got 503'", async () => {
        const name = faker.lorem.word()
        const url = faker.internet.url()
        fetchSpy.mockResolvedValue(
          new Response("nope", { status: 503 }) as Response,
        )

        const { runner } = await createRunner({
          probes: [{ name, url, expect: { status: 200 } }],
        })
        const result = await runner.run()

        expect(result![name]).toMatchObject({
          ok: false,
          error: "Expected 200, got 503",
        })
      })
    })

    describe("Given an HTTP probe with no expect and upstream returns 404", () => {
      it("should return ok: false with 'Expected 2xx, got 404'", async () => {
        const name = faker.lorem.word()
        const url = faker.internet.url()
        fetchSpy.mockResolvedValue(
          new Response("nope", { status: 404 }) as Response,
        )

        const { runner } = await createRunner({ probes: [{ name, url }] })
        const result = await runner.run()

        expect(result![name]).toMatchObject({
          ok: false,
          error: "Expected 2xx, got 404",
        })
      })
    })

    describe("Given an HTTP probe and fetch rejects (network failure)", () => {
      it("should return ok: false with the error message", async () => {
        const name = faker.lorem.word()
        const url = faker.internet.url()
        const message = faker.lorem.sentence()
        fetchSpy.mockRejectedValue(new Error(message))

        const { runner } = await createRunner({ probes: [{ name, url }] })
        const result = await runner.run()

        expect(result![name]).toMatchObject({ ok: false, error: message })
      })
    })

    describe("Given an HTTP probe that exceeds its timeout", () => {
      it("should return ok: false with 'Timeout after Xms' and abort the fetch", async () => {
        jest.useFakeTimers()
        const name = faker.lorem.word()
        const url = faker.internet.url()
        const timeout = 100

        let aborted = false
        fetchSpy.mockImplementation((_input, init) => {
          return new Promise((_, reject) => {
            const signal = (init as RequestInit | undefined)?.signal as
              | AbortSignal
              | undefined
            signal?.addEventListener("abort", () => {
              aborted = true
              const err = new Error("aborted")
              err.name = "AbortError"
              reject(err)
            })
          })
        })

        const { runner } = await createRunner({
          probes: [{ name, url, timeout }],
        })
        const probe = runner.run()
        await jest.advanceTimersByTimeAsync(timeout + 1)
        const result = await probe

        expect(aborted).toBe(true)
        expect(result![name]).toMatchObject({
          ok: false,
          error: `Timeout after ${timeout}ms`,
        })
      })
    })

    describe("Given multiple HTTP probes", () => {
      it("should dispatch them in parallel and fold by name", async () => {
        const a = faker.lorem.word() + "-a"
        const b = faker.lorem.word() + "-b"
        let resolveA: (r: Response) => void = () => {}
        let resolveB: (r: Response) => void = () => {}
        fetchSpy.mockImplementationOnce(
          () => new Promise<Response>((resolve) => (resolveA = resolve)),
        )
        fetchSpy.mockImplementationOnce(
          () => new Promise<Response>((resolve) => (resolveB = resolve)),
        )

        const { runner } = await createRunner({
          probes: [
            { name: a, url: faker.internet.url() },
            { name: b, url: faker.internet.url() },
          ],
        })
        const probePromise = runner.run()

        // Both fetches dispatched before either resolves — proves parallel.
        expect(fetchSpy).toHaveBeenCalledTimes(2)

        resolveB(new Response("ok", { status: 200 }) as Response)
        resolveA(new Response("ok", { status: 200 }) as Response)

        const result = await probePromise
        expect(result).toBeDefined()
        expect(result![a].ok).toBe(true)
        expect(result![b].ok).toBe(true)
      })
    })

    describe("Given a custom probe that resolves { ok: true }", () => {
      it("should return ok: true", async () => {
        const name = faker.lorem.word()
        const check = jest.fn().mockResolvedValue({ ok: true })

        const { runner } = await createRunner({ probes: [{ name, check }] })
        const result = await runner.run()

        expect(result![name].ok).toBe(true)
      })
    })

    describe("Given a custom probe that resolves { ok: false, error }", () => {
      it("should return ok: false with the consumer error", async () => {
        const name = faker.lorem.word()
        const error = faker.lorem.sentence()
        const check = jest.fn().mockResolvedValue({ ok: false, error })

        const { runner } = await createRunner({ probes: [{ name, check }] })
        const result = await runner.run()

        expect(result![name]).toMatchObject({ ok: false, error })
      })
    })

    describe("Given a custom probe that throws synchronously", () => {
      it("should return ok: false with the thrown message", async () => {
        const name = faker.lorem.word()
        const message = faker.lorem.sentence()
        const check = jest.fn().mockImplementation(() => {
          throw new Error(message)
        })

        const { runner } = await createRunner({ probes: [{ name, check }] })
        const result = await runner.run()

        expect(result![name]).toMatchObject({ ok: false, error: message })
      })
    })

    describe("Given a custom probe that never resolves", () => {
      it("should return ok: false with 'Timeout after Xms' after the deadline", async () => {
        jest.useFakeTimers()
        const name = faker.lorem.word()
        const timeout = 200
        const check = jest.fn(() => new Promise<never>(() => {}))

        const { runner } = await createRunner({
          probes: [{ name, check, timeout }],
        })
        const probe = runner.run()
        await jest.advanceTimersByTimeAsync(timeout + 1)
        const result = await probe

        expect(result![name]).toMatchObject({
          ok: false,
          error: `Timeout after ${timeout}ms`,
        })
      })
    })

    describe("Given a custom probe with no explicit timeout that never resolves", () => {
      it("should time out at PROBE_TIMEOUT_MS", async () => {
        jest.useFakeTimers()
        const name = faker.lorem.word()
        const check = jest.fn(() => new Promise<never>(() => {}))

        const { runner } = await createRunner({ probes: [{ name, check }] })
        const probe = runner.run()
        await jest.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS + 1)
        const result = await probe

        expect(result![name]).toMatchObject({
          ok: false,
          error: `Timeout after ${PROBE_TIMEOUT_MS}ms`,
        })
      })
    })

    describe("Given two probes share a name", () => {
      it("should warn at construction time and last-write-wins on the record", async () => {
        const warnSpy = jest.spyOn(console, "warn").mockImplementation()
        const name = faker.lorem.word()
        fetchSpy
          .mockResolvedValueOnce(
            new Response("ok", { status: 200 }) as Response,
          )
          .mockResolvedValueOnce(
            new Response("nope", { status: 503 }) as Response,
          )

        const probes: ProbeConfig[] = [
          { name, url: faker.internet.url() },
          { name, url: faker.internet.url() },
        ]
        const { runner } = await createRunner({ probes })

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Duplicate probe names"),
        )

        const result = await runner.run()
        // Last-write-wins — second probe (the failing one) is the survivor.
        expect(result![name].ok).toBe(false)

        warnSpy.mockRestore()
      })
    })
  })
})
