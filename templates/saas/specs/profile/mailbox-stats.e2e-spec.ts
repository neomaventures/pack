import { readFileSync } from "fs"
import { join } from "path"

import { faker } from "@faker-js/faker"
import { Account, OAuthToken } from "@neomaventures/auth"
import { gmail, GmailClient, google } from "@neomaventures/google-fixtures"
import { GMAIL_READONLY_SCOPE } from "@neomaventures/mailbox"
import { managedAppInstance } from "@neomaventures/managed-app"
import { mockserver } from "@neomaventures/mockserver/fixture"
import { HttpStatus } from "@nestjs/common"
import ejs from "ejs"
import request from "supertest"
import { DataSource } from "typeorm"

import { authenticate } from "~fixtures/auth/e2e"
import { configureViewEngine } from "~fixtures/configure-view-engine"

const { OK, SEE_OTHER } = HttpStatus

const fragmentTemplatePath = join(
  process.cwd(),
  "views",
  "profile",
  "mailbox-stats.ejs",
)
const fragmentTemplate = readFileSync(fragmentTemplatePath, "utf-8")

describe("GET /profile/mailbox-stats", () => {
  const gmailClient = new GmailClient(mockserver)
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({ configure: configureViewEngine })
  })

  const seedActiveGoogleToken = async (
    email: string,
  ): Promise<{ accessToken: string }> => {
    const datasource = app.get(DataSource)
    const accounts = datasource.getRepository(Account)
    const tokens = datasource.getRepository(OAuthToken)

    const account = await accounts.save(
      accounts.create({ email: email.toLowerCase(), permissions: [] }),
    )
    const accessToken = google.accessToken()
    await tokens.save(
      tokens.create({
        account,
        provider: "google",
        accessToken,
        refreshToken: google.refreshToken(),
        expiresAt: new Date(Date.now() + 3600 * 1000),
        scopes: google.sensibleScopes([GMAIL_READONLY_SCOPE]),
      }),
    )
    return { accessToken }
  }

  describe("When an authenticated user has an active google token and Gmail returns stats", () => {
    it(`should respond with HTTP ${OK} and render the mailbox-stats fragment`, async () => {
      const email = faker.internet.email().toLowerCase()
      const { accessToken } = await seedActiveGoogleToken(email)
      const messagesTotal = faker.number.int({ min: 100, max: 5000 })
      const messagesUnread = faker.number.int({ min: 0, max: 99 })
      await gmailClient.expectLabel({
        labelId: "INBOX",
        token: accessToken,
        label: gmail.label({
          id: "INBOX",
          messagesTotal,
          messagesUnread,
        }),
      })

      const cookie = await authenticate(app, email)

      const expectedHtml = ejs.render(
        fragmentTemplate,
        {
          mailboxStats: {
            folder: "INBOX",
            messageCount: messagesTotal,
            unreadCount: messagesUnread,
          },
        },
        { filename: fragmentTemplatePath },
      )

      await request(app.getHttpServer())
        .get("/profile/mailbox-stats")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)
        .expect("Content-Type", "text/html; charset=utf-8")
        .expect(expectedHtml)
    })
  })

  describe("When an unauthenticated request is made", () => {
    it(`should respond with an HTTP ${SEE_OTHER} redirect to /auth/register`, () => {
      return request(app.getHttpServer())
        .get("/profile/mailbox-stats")
        .set("Accept", "text/html")
        .expect(SEE_OTHER)
        .expect("Location", "/auth/register")
    })
  })
})
