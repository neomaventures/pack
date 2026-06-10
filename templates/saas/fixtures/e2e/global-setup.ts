import { startContainer as startMailpit } from "@neomaventures/mailpit"
import { startContainer as startMockServer } from "@neomaventures/mockserver"

export default async (): Promise<void> => {
  const [mailpitConfig, mockServerConfig] = await Promise.all([
    startMailpit(),
    startMockServer(),
  ])

  process.env.SMTP_HOST = "localhost"
  process.env.SMTP_PORT = String(mailpitConfig.smtpPort)
  process.env.MAILPIT_API = `http://localhost:${mailpitConfig.apiPort}/api/v1`

  process.env.MOCKSERVER_URL = `http://localhost:${mockServerConfig.port}/mockserver`
  process.env.GOOGLE_TOKEN_ENDPOINT = `http://localhost:${mockServerConfig.port}/token`
}
