import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

/**
 * Removes a Docker container by name. Runs `docker rm -f`
 * and swallows any errors so the call is idempotent — it is safe to call
 * even if the container does not exist.
 *
 * @internal Low-level helper used by `stopContainer` in `./container`. Not
 * part of the package's public API — consumers stop the container via the
 * exported `stopContainer` (or the `@neoma/mailpit/teardown` drop-in).
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
