import { execSync } from "child_process"

import { faker } from "@faker-js/faker"

import { stopContainer } from "./stop"

describe("stopContainer", () => {
  describe("Given a running container", () => {
    const name = `neoma-test-stop-spec-${faker.string.alphanumeric(6)}`

    beforeEach(() => {
      execSync(`docker run -d --name ${name} alpine:3.20 sleep 60`, {
        stdio: "ignore",
      })
    })

    afterEach(() => {
      // Ensure cleanup even if the test fails
      try {
        execSync(`docker rm -f ${name}`, { stdio: "ignore" })
      } catch {
        // Already removed
      }
    })

    it("should remove the container", async () => {
      await stopContainer(name)

      const output = execSync("docker ps -a --format '{{.Names}}'").toString()
      expect(output).not.toContain(name)
    })
  })

  describe("Given a container that does not exist", () => {
    it("should not throw", async () => {
      const name = `nonexistent-${faker.string.alphanumeric(8)}`

      await expect(stopContainer(name)).resolves.toBeUndefined()
    })
  })
})
