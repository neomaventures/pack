import { execSync } from "child_process"

export default async (): Promise<void> => {
  execSync("docker stop saas-mockserver 2>/dev/null || true", {
    stdio: "ignore",
  })
}
