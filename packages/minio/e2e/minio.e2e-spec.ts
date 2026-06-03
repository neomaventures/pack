import { execFileSync } from "child_process"

import { startContainer, stopContainer } from "@neomaventures/minio"

/**
 * End-to-end check against a real container, consuming the package the
 * way an installer would: imports resolve to the built `dist` at runtime
 * (see e2e/jest-e2e.json), and the container is started by the built
 * `setup` drop-in (globalSetup, via dist/setup.js). Types still resolve
 * to `src` (tsconfig paths) so goto-definition and debugging stay on
 * source.
 */
describe("@neomaventures/minio (e2e)", () => {
  // The container name follows {NEOMA_TEST_PREFIX}-minio; the e2e script
  // sets NEOMA_TEST_PREFIX=minio-e2e.
  const container = "minio-e2e-minio"
  // The e2e script sets MINIO_PORT; startContainer reads it for the host port.
  const apiPort = process.env.MINIO_PORT ?? "9000"

  it("exposes the lifecycle API from the built package", () => {
    expect(typeof startContainer).toBe("function")
    expect(typeof stopContainer).toBe("function")
  })

  describe("the container started by the setup drop-in", () => {
    it("responds to health checks on the live S3 API", async () => {
      const response = await fetch(
        `http://localhost:${apiPort}/minio/health/live`,
      )

      expect(response.ok).toBe(true)
    })

    it("created the default bucket", () => {
      const output = execFileSync("docker", [
        "exec",
        container,
        "mc",
        "ls",
        "local/",
      ]).toString()

      expect(output).toContain("test-bucket")
    })
  })
})
