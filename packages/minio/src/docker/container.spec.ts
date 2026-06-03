import { execFileSync, execSync } from "child_process"

import { faker } from "@faker-js/faker"

import { type MinIOConfig, startContainer, stopContainer } from "./container"

describe("startContainer (MinIO)", () => {
  const prefix = `neoma-test-mio-${faker.string.alphanumeric(4)}`
  const expectedContainer = `${prefix}-minio`
  // API and Console ports come from disjoint 1000-port bands so the two random
  // draws can never collide (a clash binds the same host port twice in
  // `docker run -p`, which fails).
  const apiPort = faker.number.int({ min: 19_000, max: 19_999 })
  const consolePort = faker.number.int({ min: 22_000, max: 22_999 })
  let config: MinIOConfig

  beforeAll(async () => {
    const originalApiPort = process.env.MINIO_PORT
    const originalConsolePort = process.env.MINIO_CONSOLE_PORT
    const originalPrefix = process.env.NEOMA_TEST_PREFIX

    process.env.MINIO_PORT = String(apiPort)
    process.env.MINIO_CONSOLE_PORT = String(consolePort)
    process.env.NEOMA_TEST_PREFIX = prefix

    try {
      config = await startContainer()
    } finally {
      // Restore env vars so other tests are unaffected
      if (originalApiPort === undefined) {
        delete process.env.MINIO_PORT
      } else {
        process.env.MINIO_PORT = originalApiPort
      }
      if (originalConsolePort === undefined) {
        delete process.env.MINIO_CONSOLE_PORT
      } else {
        process.env.MINIO_CONSOLE_PORT = originalConsolePort
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
  })

  describe("Given default options with env-var overrides", () => {
    it("should return the correct container name", () => {
      expect(config.container).toBe(expectedContainer)
    })

    it("should return the configured API port", () => {
      expect(config.apiPort).toBe(apiPort)
    })

    it("should return the configured Console port", () => {
      expect(config.consolePort).toBe(consolePort)
    })

    it("should return the default bucket name", () => {
      expect(config.bucket).toBe("test-bucket")
    })

    it("should have a running Docker container", () => {
      const output = execSync(
        `docker ps --filter name=${expectedContainer} --format '{{.Names}}'`,
      ).toString()

      expect(output.trim()).toBe(expectedContainer)
    })

    it("should respond to health checks", async () => {
      const response = await fetch(
        `http://localhost:${apiPort}/minio/health/live`,
      )

      expect(response.ok).toBe(true)
    })

    it("should have created the default bucket", () => {
      const output = execFileSync("docker", [
        "exec",
        expectedContainer,
        "mc",
        "ls",
        "local/",
      ]).toString()

      expect(output).toContain("test-bucket")
    })
  })

  describe("Given an explicit prefix option", () => {
    const explicitPrefix = `explicit-mio-${faker.string.alphanumeric(4)}`
    const explicitContainer = `${explicitPrefix}-minio`
    const explicitApiPort = faker.number.int({ min: 20_000, max: 20_999 })
    const explicitConsolePort = faker.number.int({ min: 23_000, max: 23_999 })
    let explicitConfig: MinIOConfig

    beforeAll(async () => {
      const originalApiPort = process.env.MINIO_PORT
      const originalConsolePort = process.env.MINIO_CONSOLE_PORT
      process.env.MINIO_PORT = String(explicitApiPort)
      process.env.MINIO_CONSOLE_PORT = String(explicitConsolePort)

      try {
        explicitConfig = await startContainer({ prefix: explicitPrefix })
      } finally {
        if (originalApiPort === undefined) {
          delete process.env.MINIO_PORT
        } else {
          process.env.MINIO_PORT = originalApiPort
        }
        if (originalConsolePort === undefined) {
          delete process.env.MINIO_CONSOLE_PORT
        } else {
          process.env.MINIO_CONSOLE_PORT = originalConsolePort
        }
      }
    }, 60_000)

    afterAll(async () => {
      await stopContainer({ prefix: explicitPrefix })
    })

    it("should use the explicit prefix for the container name", () => {
      expect(explicitConfig.container).toBe(explicitContainer)
    })

    it("should use the API port from MINIO_PORT", () => {
      expect(explicitConfig.apiPort).toBe(explicitApiPort)
    })

    it("should use the Console port from MINIO_CONSOLE_PORT", () => {
      expect(explicitConfig.consolePort).toBe(explicitConsolePort)
    })
  })

  describe("Given explicit prefix, apiPort, consolePort, and bucket options", () => {
    const bothPrefix = `both-mio-${faker.string.alphanumeric(4)}`
    const bothApiPort = faker.number.int({ min: 21_000, max: 21_999 })
    const bothConsolePort = faker.number.int({ min: 24_000, max: 24_999 })
    const bothBucket = `custom-bucket-${faker.string.alphanumeric(6).toLowerCase()}`
    const bothContainer = `${bothPrefix}-minio`
    let bothConfig: MinIOConfig

    beforeAll(async () => {
      bothConfig = await startContainer({
        prefix: bothPrefix,
        apiPort: bothApiPort,
        consolePort: bothConsolePort,
        bucket: bothBucket,
      })
    }, 60_000)

    afterAll(async () => {
      await stopContainer({ prefix: bothPrefix })
    })

    it("should use the explicit prefix for the container name", () => {
      expect(bothConfig.container).toBe(bothContainer)
    })

    it("should use the explicit API port", () => {
      expect(bothConfig.apiPort).toBe(bothApiPort)
    })

    it("should use the explicit Console port", () => {
      expect(bothConfig.consolePort).toBe(bothConsolePort)
    })

    it("should use the explicit bucket name", () => {
      expect(bothConfig.bucket).toBe(bothBucket)
    })

    it("should have a running Docker container", () => {
      const output = execSync(
        `docker ps --filter name=${bothContainer} --format '{{.Names}}'`,
      ).toString()

      expect(output.trim()).toBe(bothContainer)
    })

    it("should have created the custom bucket", () => {
      const output = execFileSync("docker", [
        "exec",
        bothContainer,
        "mc",
        "ls",
        "local/",
      ]).toString()

      expect(output).toContain(bothBucket)
    })
  })
})
