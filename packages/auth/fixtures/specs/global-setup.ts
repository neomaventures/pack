import { randomBytes, randomUUID } from "crypto"
import { join } from "path"

import { startContainer as startMailpit } from "@neomaventures/mailpit"
import { startContainer as startMockServer } from "@neomaventures/mockserver"

import { getTokenEndpoint } from "../google/oauth-api"

const NODE_ENV = process.env.NODE_ENV ?? "specs"
const isE2E = NODE_ENV === "e2e"

// Mailpit ports: specs uses 1025/8025, e2e uses 1026/8026
const MAILPIT_SMTP_PORT = isE2E ? 1026 : 1025
const MAILPIT_API_PORT = isE2E ? 8026 : 8025

// MockServer ports: specs uses 1080, e2e uses 1081
const MOCKSERVER_PORT = isE2E ? 1081 : 1080

// Set environment variables for tests
process.env.AUTH_SECRET = randomBytes(32).toString("hex")
process.env.MAILPIT_AUTH_USER = "ripley"
process.env.MAILPIT_AUTH_PASS = "xenomorph"
process.env.APP_URL = `https://${randomUUID()}.test`
process.env.MAGIC_LINK_FROM = `${randomUUID()}@weylandyutani.com`
process.env.MAGIC_LINK_WELCOME_SUBJECT = `Welcome ${randomUUID()}`
process.env.MAGIC_LINK_WELCOME_BACK_SUBJECT = `Welcome back ${randomUUID()}`

// Google OAuth test environment variables
process.env.GOOGLE_CLIENT_ID = `${randomUUID()}.apps.googleusercontent.com`
process.env.GOOGLE_CLIENT_SECRET = randomBytes(16).toString("hex")
process.env.GOOGLE_REDIRECT_URI = `https://${randomUUID()}.test/auth/google/callback`

export default async (): Promise<void> => {
  const htpasswdPath = join(__dirname, "..", "email", "smtp-auth.htpasswd")

  await Promise.all([
    startMailpit({
      prefix: `auth-${NODE_ENV}`,
      smtpPort: MAILPIT_SMTP_PORT,
      apiPort: MAILPIT_API_PORT,
      htpasswd: htpasswdPath,
    }),
    startMockServer({
      prefix: `auth-${NODE_ENV}`,
      port: MOCKSERVER_PORT,
    }),
  ])

  // Set GOOGLE_TOKEN_ENDPOINT after MockServer starts (MOCKSERVER_URL is now set)
  process.env.GOOGLE_TOKEN_ENDPOINT = getTokenEndpoint()
}
