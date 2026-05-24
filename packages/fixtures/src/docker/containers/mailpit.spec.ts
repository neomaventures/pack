import { execSync } from "child_process"
import { join } from "path"

import { faker } from "@faker-js/faker"

import { type MailpitConfig, startContainer, stopContainer } from "./mailpit"

describe("startContainer (Mailpit)", () => {
  const prefix = `neoma-test-mp-${faker.string.alphanumeric(4)}`
  const expectedContainer = `${prefix}-mailpit`
  const smtpPort = 11_025 + faker.number.int({ min: 0, max: 999 })
  const apiPort = 18_025 + faker.number.int({ min: 0, max: 999 })
  let config: MailpitConfig

  beforeAll(async () => {
    const originalSmtpPort = process.env.MAILPIT_SMTP_PORT
    const originalApiPort = process.env.MAILPIT_API_PORT
    const originalPrefix = process.env.NEOMA_TEST_PREFIX

    process.env.MAILPIT_SMTP_PORT = String(smtpPort)
    process.env.MAILPIT_API_PORT = String(apiPort)
    process.env.NEOMA_TEST_PREFIX = prefix

    try {
      config = await startContainer()
    } finally {
      // Restore env vars so other tests are unaffected
      if (originalSmtpPort === undefined) {
        delete process.env.MAILPIT_SMTP_PORT
      } else {
        process.env.MAILPIT_SMTP_PORT = originalSmtpPort
      }
      if (originalApiPort === undefined) {
        delete process.env.MAILPIT_API_PORT
      } else {
        process.env.MAILPIT_API_PORT = originalApiPort
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
    delete process.env.SMTP_HOST
    delete process.env.SMTP_PORT
    delete process.env.MAILPIT_API
  })

  describe("Given default options with env-var overrides", () => {
    it("should return the correct container name", () => {
      expect(config.container).toBe(expectedContainer)
    })

    it("should return the configured SMTP port", () => {
      expect(config.smtpPort).toBe(smtpPort)
    })

    it("should return the configured API port", () => {
      expect(config.apiPort).toBe(apiPort)
    })

    it("should set the SMTP_HOST env var", () => {
      expect(process.env.SMTP_HOST).toBe("localhost")
    })

    it("should set the SMTP_PORT env var", () => {
      expect(process.env.SMTP_PORT).toBe(String(smtpPort))
    })

    it("should set the MAILPIT_API env var", () => {
      expect(process.env.MAILPIT_API).toBe(`http://localhost:${apiPort}/api/v1`)
    })

    it("should have a running Docker container", () => {
      const output = execSync(
        `docker ps --filter name=${expectedContainer} --format '{{.Names}}'`,
      ).toString()

      expect(output.trim()).toBe(expectedContainer)
    })

    it("should respond to API health checks", async () => {
      const response = await fetch(`http://localhost:${apiPort}/api/v1/info`)

      expect(response.ok).toBe(true)
    })
  })

  describe("Given an explicit prefix option", () => {
    const explicitPrefix = `explicit-mp-${faker.string.alphanumeric(4)}`
    const explicitContainer = `${explicitPrefix}-mailpit`
    const explicitSmtpPort = 12_025 + faker.number.int({ min: 0, max: 999 })
    const explicitApiPort = 19_025 + faker.number.int({ min: 0, max: 999 })
    let explicitConfig: MailpitConfig

    beforeAll(async () => {
      const originalSmtpPort = process.env.MAILPIT_SMTP_PORT
      const originalApiPort = process.env.MAILPIT_API_PORT
      process.env.MAILPIT_SMTP_PORT = String(explicitSmtpPort)
      process.env.MAILPIT_API_PORT = String(explicitApiPort)

      try {
        explicitConfig = await startContainer({ prefix: explicitPrefix })
      } finally {
        if (originalSmtpPort === undefined) {
          delete process.env.MAILPIT_SMTP_PORT
        } else {
          process.env.MAILPIT_SMTP_PORT = originalSmtpPort
        }
        if (originalApiPort === undefined) {
          delete process.env.MAILPIT_API_PORT
        } else {
          process.env.MAILPIT_API_PORT = originalApiPort
        }
      }
    }, 60_000)

    afterAll(async () => {
      await stopContainer({ prefix: explicitPrefix })
    })

    it("should use the explicit prefix for the container name", () => {
      expect(explicitConfig.container).toBe(explicitContainer)
    })

    it("should use the SMTP port from MAILPIT_SMTP_PORT", () => {
      expect(explicitConfig.smtpPort).toBe(explicitSmtpPort)
    })

    it("should use the API port from MAILPIT_API_PORT", () => {
      expect(explicitConfig.apiPort).toBe(explicitApiPort)
    })
  })

  describe("Given explicit prefix, smtpPort, and apiPort options", () => {
    const bothPrefix = `both-mp-${faker.string.alphanumeric(4)}`
    const bothSmtpPort = 13_025 + faker.number.int({ min: 0, max: 999 })
    const bothApiPort = 20_025 + faker.number.int({ min: 0, max: 999 })
    const bothContainer = `${bothPrefix}-mailpit`
    let bothConfig: MailpitConfig

    beforeAll(async () => {
      bothConfig = await startContainer({
        prefix: bothPrefix,
        smtpPort: bothSmtpPort,
        apiPort: bothApiPort,
      })
    }, 60_000)

    afterAll(async () => {
      await stopContainer({ prefix: bothPrefix })
    })

    it("should use the explicit prefix for the container name", () => {
      expect(bothConfig.container).toBe(bothContainer)
    })

    it("should use the explicit SMTP port", () => {
      expect(bothConfig.smtpPort).toBe(bothSmtpPort)
    })

    it("should use the explicit API port", () => {
      expect(bothConfig.apiPort).toBe(bothApiPort)
    })

    it("should have a running Docker container", () => {
      const output = execSync(
        `docker ps --filter name=${bothContainer} --format '{{.Names}}'`,
      ).toString()

      expect(output.trim()).toBe(bothContainer)
    })
  })

  describe("Given an htpasswd file", () => {
    const authPrefix = `auth-mp-${faker.string.alphanumeric(4)}`
    const authSmtpPort = 15_025 + faker.number.int({ min: 0, max: 999 })
    const authApiPort = 21_025 + faker.number.int({ min: 0, max: 999 })
    const authContainer = `${authPrefix}-mailpit`
    let authConfig: MailpitConfig

    beforeAll(async () => {
      const htpasswdPath = join(
        __dirname,
        "..",
        "..",
        "..",
        "test",
        "email",
        "smtp-auth.htpasswd",
      )

      authConfig = await startContainer({
        prefix: authPrefix,
        smtpPort: authSmtpPort,
        apiPort: authApiPort,
        htpasswd: htpasswdPath,
      })
    }, 60_000)

    afterAll(async () => {
      await stopContainer({ prefix: authPrefix })
    })

    it("should start the container with auth enabled", () => {
      expect(authConfig.container).toBe(authContainer)
    })

    it("should have a running Docker container", () => {
      const output = execSync(
        `docker ps --filter name=${authContainer} --format '{{.Names}}'`,
      ).toString()

      expect(output.trim()).toBe(authContainer)
    })

    it("should have the htpasswd file mounted", () => {
      const output = execSync(
        `docker exec ${authContainer} cat /auth.htpasswd`,
      ).toString()

      expect(output).toContain("testuser:")
    })
  })
})
