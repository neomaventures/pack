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

  it("exposes the lifecycle API from the built package", () => {
    expect(typeof startContainer).toBe("function")
    expect(typeof stopContainer).toBe("function")
  })

  describe("the container started by the setup drop-in", () => {
    it("sets the STORAGE_* env contract", () => {
      expect(process.env.STORAGE_ENDPOINT).toBe("http://localhost:9010")
      expect(process.env.STORAGE_REGION).toBe("us-east-1")
      expect(process.env.STORAGE_ACCESS_KEY).toBe("minioadmin")
      expect(process.env.STORAGE_SECRET_KEY).toBe("minioadmin")
      expect(process.env.STORAGE_BUCKET).toBe("test-bucket")
      expect(process.env.STORAGE_FORCE_PATH_STYLE).toBe("true")
    })

    it("responds to health checks on the live S3 API", async () => {
      const response = await fetch(
        `${process.env.STORAGE_ENDPOINT}/minio/health/live`,
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
