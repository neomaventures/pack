import { faker } from "@faker-js/faker"
import { mockserver } from "@neomaventures/mockserver/fixture"
import { Test, type TestingModule } from "@nestjs/testing"

import {
  HEALTHCHECK_OPTIONS,
  type HealthcheckOptions,
} from "../healthcheck.options"

import { type ProbeMap } from "./probe-config"
import { ProbeRunnerService } from "./probe-runner.service"

// Note: lifted to top of file to keep a stable origin for probe URLs that
// matches the mockserver listener (mockserver's management API lives at
// `${MOCKSERVER_URL}` — `/mockserver` — and mocked endpoints are served
// from the root of the same origin).
const MOCKSERVER_ORIGIN = process.env.MOCKSERVER_URL!.replace("/mockserver", "")

async function createRunner(options: HealthcheckOptions): Promise<{
  runner: ProbeRunnerService
  module: TestingModule
}> {
  const module = await Test.createTestingModule({
    providers: [
      ProbeRunnerService,
      { provide: HEALTHCHECK_OPTIONS, useValue: options },
    ],
  }).compile()
  const runner = module.get<ProbeRunnerService>(ProbeRunnerService)
  return { runner, module }
}

function randomPath(): string {
  return `/probe-${faker.string.alphanumeric(8)}`
}

describe("ProbeRunnerService", () => {
  describe("run()", () => {
    describe("Given options.probes is empty", () => {
      it("should return undefined", async () => {
        const { runner } = await createRunner({ probes: {} })

        await expect(runner.run()).resolves.toBeUndefined()
      })
    })

    describe("Given a single HTTP probe and the upstream returns 200", () => {
      it("should fold the result under the map key with ok: true", async () => {
        const name = faker.lorem.word()
        const path = randomPath()
        await mockserver.createExpectation({
          httpRequest: { path, method: "GET" },
          httpResponse: { statusCode: 200, body: "ok" },
          times: { unlimited: true },
        })

        const { runner } = await createRunner({
          probes: { [name]: { url: `${MOCKSERVER_ORIGIN}${path}` } },
        })
        const result = await runner.run()

        expect(result![name]).toMatchObject({
          ok: true,
          latencyMs: expect.any(Number),
        })
        expect(result![name].error).toBeUndefined()
      })
    })

    describe("Given an HTTP probe with expect.status = 204 and upstream returns 204", () => {
      it("should return ok: true", async () => {
        const name = faker.lorem.word()
        const path = randomPath()
        await mockserver.createExpectation({
          httpRequest: { path, method: "GET" },
          httpResponse: { statusCode: 204, body: "" },
          times: { unlimited: true },
        })

        const { runner } = await createRunner({
          probes: {
            [name]: {
              url: `${MOCKSERVER_ORIGIN}${path}`,
              expect: { status: 204 },
            },
          },
        })
        const result = await runner.run()

        expect(result![name]).toMatchObject({
          ok: true,
          latencyMs: expect.any(Number),
        })
      })
    })

    describe("Given an HTTP probe with expect.status = 200 and upstream returns 503", () => {
      it("should return ok: false with 'Expected 200, got 503'", async () => {
        const name = faker.lorem.word()
        const path = randomPath()
        await mockserver.createExpectation({
          httpRequest: { path, method: "GET" },
          httpResponse: { statusCode: 503, body: "nope" },
          times: { unlimited: true },
        })

        const { runner } = await createRunner({
          probes: {
            [name]: {
              url: `${MOCKSERVER_ORIGIN}${path}`,
              expect: { status: 200 },
            },
          },
        })
        const result = await runner.run()

        expect(result![name]).toMatchObject({
          ok: false,
          latencyMs: expect.any(Number),
          error: "Expected 200, got 503",
        })
      })
    })

    describe("Given an HTTP probe with no expect and upstream returns 404", () => {
      it("should return ok: false with 'Expected 2xx, got 404'", async () => {
        const name = faker.lorem.word()
        const path = randomPath()
        await mockserver.createExpectation({
          httpRequest: { path, method: "GET" },
          httpResponse: { statusCode: 404, body: "nope" },
          times: { unlimited: true },
        })

        const { runner } = await createRunner({
          probes: { [name]: { url: `${MOCKSERVER_ORIGIN}${path}` } },
        })
        const result = await runner.run()

        expect(result![name]).toMatchObject({
          ok: false,
          latencyMs: expect.any(Number),
          error: "Expected 2xx, got 404",
        })
      })
    })

    describe("Given an HTTP probe and the upstream drops the connection", () => {
      it("should return ok: false with a non-empty error message", async () => {
        const name = faker.lorem.word()
        const path = randomPath()
        await mockserver.createExpectation({
          httpRequest: { path, method: "GET" },
          httpError: { dropConnection: true },
          times: { unlimited: true },
        })

        const { runner } = await createRunner({
          probes: { [name]: { url: `${MOCKSERVER_ORIGIN}${path}` } },
        })
        const result = await runner.run()

        expect(result![name]).toMatchObject({
          ok: false,
          latencyMs: expect.any(Number),
          error: expect.any(String),
        })
        expect(result![name].error).not.toBe("")
      })
    })

    describe("Given an HTTP probe that exceeds its timeout", () => {
      it("should return ok: false with 'Timeout after Xms' once the deadline elapses", async () => {
        const name = faker.lorem.word()
        const path = randomPath()
        const timeout = 50
        await mockserver.createExpectation({
          httpRequest: { path, method: "GET" },
          httpResponse: {
            statusCode: 200,
            body: "ok",
            delay: { timeUnit: "MILLISECONDS", value: 2000 },
          },
          times: { unlimited: true },
        })

        const { runner } = await createRunner({
          probes: {
            [name]: { url: `${MOCKSERVER_ORIGIN}${path}`, timeout },
          },
        })
        const result = await runner.run()

        expect(result![name]).toMatchObject({
          ok: false,
          latencyMs: expect.any(Number),
          error: `Timeout after ${timeout}ms`,
        })
      })
    })

    describe("Given multiple HTTP probes", () => {
      it("should dispatch them in parallel and fold by name", async () => {
        const a = `${faker.lorem.word()}-a`
        const b = `${faker.lorem.word()}-b`
        const pathA = randomPath()
        const pathB = randomPath()
        await mockserver.createExpectation({
          httpRequest: { path: pathA, method: "GET" },
          httpResponse: { statusCode: 200, body: "ok" },
          times: { unlimited: true },
        })
        await mockserver.createExpectation({
          httpRequest: { path: pathB, method: "GET" },
          httpResponse: { statusCode: 200, body: "ok" },
          times: { unlimited: true },
        })

        const { runner } = await createRunner({
          probes: {
            [a]: { url: `${MOCKSERVER_ORIGIN}${pathA}` },
            [b]: { url: `${MOCKSERVER_ORIGIN}${pathB}` },
          },
        })
        const result = await runner.run()

        expect(result![a]).toMatchObject({ ok: true })
        expect(result![b]).toMatchObject({ ok: true })
      })
    })

    describe("Given a custom probe that resolves { ok: true }", () => {
      it("should return ok: true", async () => {
        const name = faker.lorem.word()
        const check = jest.fn().mockResolvedValue({ ok: true })

        const { runner } = await createRunner({
          probes: { [name]: { check } } as ProbeMap,
        })
        const result = await runner.run()

        expect(result![name]).toMatchObject({
          ok: true,
          latencyMs: expect.any(Number),
        })
      })
    })

    describe("Given a custom probe that resolves { ok: false, error }", () => {
      it("should return ok: false with the consumer error", async () => {
        const name = faker.lorem.word()
        const error = faker.lorem.sentence()
        const check = jest.fn().mockResolvedValue({ ok: false, error })

        const { runner } = await createRunner({
          probes: { [name]: { check } } as ProbeMap,
        })
        const result = await runner.run()

        expect(result![name]).toMatchObject({
          ok: false,
          latencyMs: expect.any(Number),
          error,
        })
      })
    })

    describe("Given a custom probe that throws synchronously", () => {
      it("should return ok: false with the thrown message", async () => {
        const name = faker.lorem.word()
        const message = faker.lorem.sentence()
        const check = jest.fn().mockImplementation(() => {
          throw new Error(message)
        })

        const { runner } = await createRunner({
          probes: { [name]: { check } } as ProbeMap,
        })
        const result = await runner.run()

        expect(result![name]).toMatchObject({
          ok: false,
          latencyMs: expect.any(Number),
          error: message,
        })
      })
    })

    describe("Given a custom probe that never resolves", () => {
      it("should return ok: false with 'Timeout after Xms' after the deadline", async () => {
        const name = faker.lorem.word()
        const timeout = 50
        const check = jest.fn(() => new Promise<never>(() => {}))

        const { runner } = await createRunner({
          probes: { [name]: { check, timeout } } as ProbeMap,
        })
        const result = await runner.run()

        expect(result![name]).toMatchObject({
          ok: false,
          latencyMs: expect.any(Number),
          error: `Timeout after ${timeout}ms`,
        })
      })
    })
  })
})
