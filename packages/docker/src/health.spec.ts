import { execFileSync } from "child_process"

import { faker } from "@faker-js/faker"

import { waitForHttp, waitForTcp } from "./health"
import { stopContainer } from "./stop"

describe("waitForTcp", () => {
  const containerName = `neoma-test-tcp-spec-${faker.string.alphanumeric(6)}`
  const smtpPort = 14_025 + faker.number.int({ min: 0, max: 999 })

  beforeAll(() => {
    // Start a Mailpit container to have a real TCP endpoint (SMTP)
    try {
      execFileSync("docker", ["rm", "-f", containerName], { stdio: "ignore" })
    } catch {
      // Ignore
    }

    execFileSync(
      "docker",
      [
        "run",
        "-d",
        "--name",
        containerName,
        "-p",
        `${smtpPort}:1025`,
        "axllent/mailpit:v1.21",
      ],
      { stdio: "ignore" },
    )
  }, 60_000)

  afterAll(async () => {
    await stopContainer(containerName)
  })

  describe("Given a healthy TCP port", () => {
    it("should resolve when the port accepts a connection", async () => {
      await expect(
        waitForTcp("localhost", smtpPort, {
          timeoutMs: 30_000,
        }),
      ).resolves.toBeUndefined()
    }, 60_000)
  })

  describe("Given an unreachable TCP port", () => {
    it("should throw after exhausting retries", async () => {
      await expect(
        waitForTcp("localhost", 1, {
          retries: 2,
          intervalMs: 100,
          timeoutMs: 1000,
        }),
      ).rejects.toThrow(/Health check failed/)
    })
  })

  describe("Given a timeout of zero milliseconds", () => {
    it("should abort before exhausting retries", async () => {
      await expect(
        waitForTcp("localhost", 1, {
          retries: 100,
          intervalMs: 100,
          timeoutMs: 0,
        }),
      ).rejects.toThrow(/Health check failed/)
    })
  })
})

describe("waitForHttp", () => {
  const containerName = `neoma-test-health-spec-${faker.string.alphanumeric(6)}`
  const port = 10_080 + faker.number.int({ min: 0, max: 999 })

  beforeAll(() => {
    // Start a MockServer container to have a real HTTP endpoint
    try {
      execFileSync("docker", ["rm", "-f", containerName], { stdio: "ignore" })
    } catch {
      // Ignore
    }

    execFileSync(
      "docker",
      [
        "run",
        "-d",
        "--name",
        containerName,
        "-p",
        `${port}:1080`,
        "mockserver/mockserver:5.15.0",
      ],
      { stdio: "ignore" },
    )
  }, 60_000)

  afterAll(async () => {
    await stopContainer(containerName)
  })

  describe("Given a healthy endpoint", () => {
    it("should resolve when the endpoint returns 2xx", async () => {
      await expect(
        waitForHttp(`http://localhost:${port}/mockserver/status`, {
          method: "PUT",
          timeoutMs: 30_000,
        }),
      ).resolves.toBeUndefined()
    }, 60_000)
  })

  describe("Given an unreachable endpoint", () => {
    it("should throw after exhausting retries", async () => {
      await expect(
        waitForHttp("http://localhost:1/nonexistent", {
          retries: 2,
          intervalMs: 100,
          timeoutMs: 1000,
        }),
      ).rejects.toThrow(/Health check failed/)
    })
  })

  describe("Given a timeout of zero milliseconds", () => {
    it("should abort before exhausting retries", async () => {
      await expect(
        waitForHttp("http://localhost:1/nonexistent", {
          retries: 100,
          intervalMs: 100,
          timeoutMs: 0,
        }),
      ).rejects.toThrow(/Health check failed/)
    })
  })
})
