import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

/**
 * Removes a Docker container by name. Runs `docker rm -f`
 * and swallows any errors so the call is idempotent — it is safe to call
 * even if the container does not exist.
 *
 * @internal Used by per-service stop functions. Not exported from the
 * `@neoma/fixtures/docker` barrel — consumers should use `stopMockServer`,
 * `stopMailpit`, or `stopMinIO` instead.
 *
 * @param name - The name of the container to remove
 */
export async function stopContainer(name: string): Promise<void> {
  try {
    await execFileAsync("docker", ["rm", "-f", name])
  } catch {
    // Swallow — container may already be removed
  }
}
