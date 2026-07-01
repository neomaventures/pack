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
import { npmPackageName, npmPackageVersion } from "~fixtures/package-version"

const { OK } = HttpStatus

const template = readFileSync(
  join(process.cwd(), "views", "profile.ejs"),
  "utf-8",
)

describe("GET /profile - connected accounts section", () => {
  const gmailClient = new GmailClient(mockserver)
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({
      configure: configureViewEngine,
    })
  })

  describe("Given a user with an active Google token covering gmail.readonly", () => {
    it("should render the profile template with the Google account listed as active and stats populated", async () => {
      const email = faker.internet.email().toLowerCase()
      const accessToken = google.accessToken()
      const refreshToken = google.refreshToken()
      const scopes = google.sensibleScopes([GMAIL_READONLY_SCOPE])
      const expiresAt = new Date(Date.now() + 3600 * 1000)
      const messageCount = faker.number.int({ min: 100, max: 5000 })
      const unreadCount = faker.number.int({ min: 0, max: 99 })

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
          expiresAt,
          scopes,
        }),
      )

      await gmailClient.expectLabel({
        labelId: "INBOX",
        token: accessToken,
        label: gmail.label({
          id: "INBOX",
          messagesTotal: messageCount,
          messagesUnread: unreadCount,
        }),
      })

      const cookie = await authenticate(app, email)

      const expectedHtml = ejs.render(
        template,
        {
          npmPackageName,
          npmPackageVersion,
          connectedAccounts: [
            {
              provider: "google",
              email,
              scopes,
              expiresAt,
              active: true,
              stats: {
                folder: "INBOX",
                messageCount,
                unreadCount,
              },
              statsError: null,
            },
          ],
        },
        { filename: join(process.cwd(), "views", "profile.ejs") },
      )

      await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)
        .expect(expectedHtml)
        .expect((res) => {
          // Tokens themselves must never appear in the rendered HTML.
          expect(res.text).not.toContain(accessToken)
          expect(res.text).not.toContain(refreshToken)
        })
    })
  })

  describe("Given a user with an expired Google token", () => {
    it("should render the profile template with the Google account listed as Expired and no stats", async () => {
      const email = faker.internet.email().toLowerCase()
      const accessToken = google.accessToken()
      const refreshToken = google.refreshToken()
      const scopes = google.sensibleScopes([GMAIL_READONLY_SCOPE])
      const expiresAt = new Date(Date.now() - 60 * 1000)

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
          expiresAt,
          scopes,
        }),
      )

      const cookie = await authenticate(app, email)

      const expectedHtml = ejs.render(
        template,
        {
          npmPackageName,
          npmPackageVersion,
          connectedAccounts: [
            {
              provider: "google",
              email,
              scopes,
              expiresAt,
              active: false,
              stats: null,
              statsError: null,
            },
          ],
        },
        { filename: join(process.cwd(), "views", "profile.ejs") },
      )

      await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)
        .expect(expectedHtml)
    })
  })
})
