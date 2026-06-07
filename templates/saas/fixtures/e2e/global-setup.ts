import { startContainer } from "@neomaventures/mailpit"

export default async (): Promise<void> => {
  const config = await startContainer()

  process.env.SMTP_HOST = "localhost"
  process.env.SMTP_PORT = String(config.smtpPort)
  process.env.MAILPIT_API = `http://localhost:${config.apiPort}/api/v1`
}
