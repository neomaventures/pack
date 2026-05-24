import { execFileSync, execSync } from "child_process"

import { faker } from "@faker-js/faker"

import { type MinIOConfig, startContainer, stopContainer } from "./minio"

describe("startContainer (MinIO)", () => {
  const prefix = `neoma-test-mio-${faker.string.alphanumeric(4)}`
  const expectedContainer = `${prefix}-minio`
  const apiPort = 19_000 + faker.number.int({ min: 0, max: 999 })
  const consolePort = 19_001 + faker.number.int({ min: 0, max: 999 })
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
    delete process.env.STORAGE_ENDPOINT
    delete process.env.STORAGE_REGION
    delete process.env.STORAGE_ACCESS_KEY
    delete process.env.STORAGE_SECRET_KEY
    delete process.env.STORAGE_BUCKET
    delete process.env.STORAGE_FORCE_PATH_STYLE
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

    it("should set the STORAGE_ENDPOINT env var", () => {
      expect(process.env.STORAGE_ENDPOINT).toBe(`http://localhost:${apiPort}`)
    })

    it("should set the STORAGE_REGION env var", () => {
      expect(process.env.STORAGE_REGION).toBe("us-east-1")
    })

    it("should set the STORAGE_ACCESS_KEY env var", () => {
      expect(process.env.STORAGE_ACCESS_KEY).toBe("minioadmin")
    })

    it("should set the STORAGE_SECRET_KEY env var", () => {
      expect(process.env.STORAGE_SECRET_KEY).toBe("minioadmin")
    })

    it("should set the STORAGE_BUCKET env var", () => {
      expect(process.env.STORAGE_BUCKET).toBe("test-bucket")
    })

    it("should set the STORAGE_FORCE_PATH_STYLE env var", () => {
      expect(process.env.STORAGE_FORCE_PATH_STYLE).toBe("true")
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
    const explicitApiPort = 20_000 + faker.number.int({ min: 0, max: 999 })
    const explicitConsolePort = 20_001 + faker.number.int({ min: 0, max: 999 })
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
    const bothApiPort = 21_000 + faker.number.int({ min: 0, max: 999 })
    const bothConsolePort = 21_001 + faker.number.int({ min: 0, max: 999 })
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
