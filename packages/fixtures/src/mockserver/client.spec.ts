import { faker } from "@faker-js/faker"

import {
  type MockServerConfig,
  startMockServer,
  stopMockServer,
} from "../docker"

import { MockServerClient } from "./client"
import { type MockserverExpectation } from "./types"

describe("MockServerClient", () => {
  const prefix = `neoma-test-msc-${faker.string.alphanumeric(4)}`
  const port = 14_080 + faker.number.int({ min: 0, max: 899 })
  let config: MockServerConfig
  let client: MockServerClient

  beforeAll(async () => {
    config = await startMockServer({ prefix, port })
    client = new MockServerClient(`http://localhost:${config.port}/mockserver`)
  }, 60_000)

  afterAll(async () => {
    await stopMockServer({ prefix })
    delete process.env.MOCKSERVER_URL
  })

  beforeEach(async () => {
    await client.reset()
  })

  describe("reset()", () => {
    it("should clear all expectations", async () => {
      const path = `/${faker.word.noun()}`

      await client.createExpectation({
        httpRequest: { path, method: "GET" },
        httpResponse: { statusCode: 200, body: "ok" },
        times: { unlimited: true },
      })

      // Confirm the expectation is active
      const before = await fetch(`http://localhost:${config.port}${path}`)
      expect(before.status).toBe(200)

      // Reset
      await client.reset()

      // After reset, the expectation should be gone (MockServer returns 404)
      const after = await fetch(`http://localhost:${config.port}${path}`)
      expect(after.status).toBe(404)
    })
  })

  describe("createExpectation()", () => {
    it("should register an expectation that responds correctly", async () => {
      const path = `/${faker.word.noun()}`
      const responseBody = JSON.stringify({ id: faker.string.uuid() })

      const expectation: MockserverExpectation = {
        httpRequest: { path, method: "GET" },
        httpResponse: { statusCode: 201, body: responseBody },
        times: { unlimited: true },
      }

      await client.createExpectation(expectation)

      const response = await fetch(`http://localhost:${config.port}${path}`)

      expect(response.status).toBe(201)
      expect(await response.text()).toBe(responseBody)
    })

    it("should respect specific times", async () => {
      const path = `/${faker.word.noun()}`

      const expectation: MockserverExpectation = {
        httpRequest: { path, method: "GET" },
        httpResponse: { statusCode: 200, body: "once" },
        times: { remainingTimes: 1 },
      }

      await client.createExpectation(expectation)

      const first = await fetch(`http://localhost:${config.port}${path}`)
      expect(first.status).toBe(200)

      const second = await fetch(`http://localhost:${config.port}${path}`)
      expect(second.status).toBe(404)
    })
  })

  describe("verifyExpectationMatched()", () => {
    it("should return true when a request was matched", async () => {
      const path = `/${faker.word.noun()}`

      await client.createExpectation({
        httpRequest: { path, method: "GET" },
        httpResponse: { statusCode: 200, body: "ok" },
        times: { unlimited: true },
      })

      await fetch(`http://localhost:${config.port}${path}`)

      const matched = await client.verifyExpectationMatched({
        path,
        method: "GET",
      })

      expect(matched).toBe(true)
    })

    it("should return false for unmatched requests", async () => {
      const path = `/${faker.word.noun()}`

      const matched = await client.verifyExpectationMatched({
        path,
        method: "GET",
      })

      expect(matched).toBe(false)
    })

    it("should support a custom count parameter", async () => {
      const path = `/${faker.word.noun()}`

      await client.createExpectation({
        httpRequest: { path, method: "GET" },
        httpResponse: { statusCode: 200, body: "ok" },
        times: { unlimited: true },
      })

      // Make the request three times
      await fetch(`http://localhost:${config.port}${path}`)
      await fetch(`http://localhost:${config.port}${path}`)
      await fetch(`http://localhost:${config.port}${path}`)

      const matchedThree = await client.verifyExpectationMatched(
        { path, method: "GET" },
        3,
      )
      expect(matchedThree).toBe(true)

      const matchedTwo = await client.verifyExpectationMatched(
        { path, method: "GET" },
        2,
      )
      expect(matchedTwo).toBe(false)
    })
  })
})
