import { execSync } from "child_process"

async function waitForHttp(url: string, timeoutMs = 30000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: "PUT" })
      if (response.ok) return
    } catch {
      // Not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

export default async (): Promise<void> => {
  execSync(
    "docker start saas-mailpit 2>/dev/null || docker run -d --name saas-mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit",
    { stdio: "ignore" },
  )

  execSync(
    "docker start saas-mockserver 2>/dev/null || docker run -d --name saas-mockserver -p 1080:1080 mockserver/mockserver:5.15.0",
    { stdio: "ignore" },
  )

  await waitForHttp("http://localhost:1080/mockserver/status")
}
