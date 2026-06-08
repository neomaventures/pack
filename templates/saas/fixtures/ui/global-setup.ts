import { execSync } from "child_process"

export default async (): Promise<void> => {
  execSync(
    "docker start saas-mailpit 2>/dev/null || docker run -d --name saas-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit",
    { stdio: "ignore" },
  )
}
