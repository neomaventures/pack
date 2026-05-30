import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

/**
 * Removes a Docker container by name. Runs `docker rm -f` and swallows any
 * errors so the call is idempotent — safe to call even if the container does
 * not exist. Service packages wrap this with their own naming convention
 * (e.g. `stopContainer({ prefix })` in `@neomaventures/mailpit`).
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
