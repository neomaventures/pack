import { execSync } from "child_process"

import { faker } from "@faker-js/faker"

import {
  type MockServerConfig,
  startContainer,
  stopContainer,
} from "./mockserver"

describe("startContainer (MockServer)", () => {
  const prefix = `neoma-test-ms-${faker.string.alphanumeric(4)}`
  const expectedContainer = `${prefix}-mockserver`
  const port = 11_080 + faker.number.int({ min: 0, max: 999 })
  let config: MockServerConfig

  beforeAll(async () => {
    const originalPort = process.env.MOCKSERVER_PORT
    const originalPrefix = process.env.NEOMA_TEST_PREFIX

    process.env.MOCKSERVER_PORT = String(port)
    process.env.NEOMA_TEST_PREFIX = prefix

    try {
      config = await startContainer()
    } finally {
      // Restore env vars so other tests are unaffected
      if (originalPort === undefined) {
        delete process.env.MOCKSERVER_PORT
      } else {
        process.env.MOCKSERVER_PORT = originalPort
      }
      if (originalPrefix === undefined) {
        delete process.env.NEOMA_TEST_PREFIX
      } else {
        process.env.NEOMA_TEST_PREFIX = originalPrefix
      }
    }
  }, 60_000)

  afterAll(async () => {
    await stopContainer({ prefix })
    delete process.env.MOCKSERVER_URL
  })

  describe("Given default options with env-var overrides", () => {
    it("should return the correct container name", () => {
      expect(config.container).toBe(expectedContainer)
    })

    it("should return the configured port", () => {
      expect(config.port).toBe(port)
    })

    it("should set the MOCKSERVER_URL env var", () => {
      expect(process.env.MOCKSERVER_URL).toBe(
        `http://localhost:${port}/mockserver`,
      )
    })

    it("should have a running Docker container", () => {
      const output = execSync(
        `docker ps --filter name=${expectedContainer} --format '{{.Names}}'`,
      ).toString()

      expect(output.trim()).toBe(expectedContainer)
    })

    it("should respond to health checks", async () => {
      const response = await fetch(
        `http://localhost:${port}/mockserver/status`,
        { method: "PUT" },
      )

      expect(response.ok).toBe(true)
    })
  })

  describe("Given an explicit prefix option", () => {
    const explicitPrefix = `explicit-${faker.string.alphanumeric(4)}`
    const explicitContainer = `${explicitPrefix}-mockserver`
    const explicitPort = 12_080 + faker.number.int({ min: 0, max: 999 })
    let explicitConfig: MockServerConfig

    beforeAll(async () => {
      const originalPort = process.env.MOCKSERVER_PORT
      process.env.MOCKSERVER_PORT = String(explicitPort)

      try {
        explicitConfig = await startContainer({ prefix: explicitPrefix })
      } finally {
        if (originalPort === undefined) {
          delete process.env.MOCKSERVER_PORT
        } else {
          process.env.MOCKSERVER_PORT = originalPort
        }
      }
    }, 60_000)

    afterAll(async () => {
      await stopContainer({ prefix: explicitPrefix })
    })

    it("should use the explicit prefix for the container name", () => {
      expect(explicitConfig.container).toBe(explicitContainer)
    })

    it("should use the port from MOCKSERVER_PORT", () => {
      expect(explicitConfig.port).toBe(explicitPort)
    })
  })

  describe("Given explicit prefix and port options", () => {
    const bothPrefix = `both-${faker.string.alphanumeric(4)}`
    const bothPort = 13_080 + faker.number.int({ min: 0, max: 999 })
    const bothContainer = `${bothPrefix}-mockserver`
    let bothConfig: MockServerConfig

    beforeAll(async () => {
      bothConfig = await startContainer({ prefix: bothPrefix, port: bothPort })
    }, 60_000)

    afterAll(async () => {
      await stopContainer({ prefix: bothPrefix })
    })

    it("should use the explicit prefix for the container name", () => {
      expect(bothConfig.container).toBe(bothContainer)
    })

    it("should use the explicit port", () => {
      expect(bothConfig.port).toBe(bothPort)
    })

    it("should have a running Docker container", () => {
      const output = execSync(
        `docker ps --filter name=${bothContainer} --format '{{.Names}}'`,
      ).toString()

      expect(output.trim()).toBe(bothContainer)
    })
  })
})
