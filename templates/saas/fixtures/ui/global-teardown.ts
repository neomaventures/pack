import { execSync } from "child_process"

import { stopContainer as stopMinio } from "@neomaventures/minio"

export default async (): Promise<void> => {
  execSync("docker stop saas-mockserver 2>/dev/null || true", {
    stdio: "ignore",
  })
  execSync("docker stop saas-mailpit 2>/dev/null || true", {
    stdio: "ignore",
  })
  await stopMinio()
}
