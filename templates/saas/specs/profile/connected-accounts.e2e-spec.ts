import { faker } from "@faker-js/faker"
import { Account, OAuthToken } from "@neomaventures/auth"
import { gmail, GmailClient } from "@neomaventures/google-fixtures"
import { GMAIL_READONLY_SCOPE } from "@neomaventures/mailbox"
import { managedAppInstance } from "@neomaventures/managed-app"
import { mockserver } from "@neomaventures/mockserver/fixture"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"
import { DataSource } from "typeorm"

import { authenticate } from "~fixtures/auth/e2e"
import { configureViewEngine } from "~fixtures/configure-view-engine"

const { OK } = HttpStatus

describe("GET /profile - connected accounts section", () => {
  const gmailClient = new GmailClient(mockserver)
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({
      configure: configureViewEngine,
    })
  })

  describe("Given a user with an active Google token covering gmail.readonly", () => {
    it("should render the profile page with the Google account listed as active including scopes and expiry", async () => {
      const email = faker.internet.email().toLowerCase()
      const accessToken = faker.string.alphanumeric(40)
      const refreshToken = faker.string.alphanumeric(40)
      const scopes = ["openid", "email", "profile", GMAIL_READONLY_SCOPE]

      const datasource = app.get(DataSource)
      const accounts = datasource.getRepository(Account)
      const tokens = datasource.getRepository(OAuthToken)

      const account = await accounts.save(
        accounts.create({ email, permissions: [] }),
      )
      await tokens.save(
        tokens.create({
          account,
          provider: "google",
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 3600 * 1000),
          scopes,
        }),
      )

      // Mailbox stats interceptor runs on GET /profile; satisfy its
      // Gmail call so the handler runs and renders connectedAccounts.
      await gmailClient.expectLabel({
        labelId: "INBOX",
        token: accessToken,
        label: gmail.label({ id: "INBOX" }),
      })

      const cookie = await authenticate(app, email)

      const res = await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)

      const html = res.text
      expect(html).toContain('data-provider="google"')
      expect(html).toContain("Active")
      expect(html).toContain(`Scopes: ${scopes.join(", ")}`)
      expect(html).toContain("Expires:")
      // Tokens themselves must never appear in the rendered HTML.
      expect(html).not.toContain(accessToken)
      expect(html).not.toContain(refreshToken)
    })
  })

  // The "Expired" badge variant of the connected-accounts section
  // (`active: false`) is exercised by the ProfileController unit spec.
  // It can no longer be reached through GET /profile end-to-end because
  // mailbox's interceptor treats an expired google token as "not
  // connected" and throws GmailNotConnectedException before the handler
  // runs, so `connectedAccounts` is never populated for the template to
  // iterate. The expired → not_connected wire behaviour is exercised by
  // `mailbox-stats.e2e-spec.ts`.
})
