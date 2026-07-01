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

describe("GET /profile - mailbox stats section", () => {
  const gmailClient = new GmailClient(mockserver)
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({ configure: configureViewEngine })
  })

  const seedActiveGoogleToken = async (
    email: string,
    {
      accessToken = google.accessToken(),
      scopes = google.sensibleScopes([GMAIL_READONLY_SCOPE]),
      expiresAt = new Date(Date.now() + 3600 * 1000),
    }: {
      accessToken?: string
      scopes?: string[]
      expiresAt?: Date
    } = {},
  ): Promise<{
    account: Account
    accessToken: string
    scopes: string[]
    expiresAt: Date
  }> => {
    const datasource = app.get(DataSource)
    const accounts = datasource.getRepository(Account)
    const tokens = datasource.getRepository(OAuthToken)

    const account = await accounts.save(
      accounts.create({ email: email.toLowerCase(), permissions: [] }),
    )
    await tokens.save(
      tokens.create({
        account,
        provider: "google",
        accessToken,
        refreshToken: google.refreshToken(),
        expiresAt,
        scopes,
      }),
    )
    return { account, accessToken, scopes, expiresAt }
  }

  const renderProfile = (
    connectedAccounts: Array<{
      provider: string
      email: string
      scopes: string[]
      expiresAt: Date
      active: boolean
      stats: {
        folder: string
        messageCount: number
        unreadCount: number
      } | null
      statsError: "unavailable" | null
    }>,
  ): string =>
    ejs.render(
      template,
      { npmPackageName, npmPackageVersion, connectedAccounts },
      { filename: join(process.cwd(), "views", "profile.ejs") },
    )

  describe("Given a user with an active google token covering gmail.readonly and a successful Gmail response", () => {
    it("should respond with HTTP 200 and render the profile template with the message + unread counts", async () => {
      const email = faker.internet.email().toLowerCase()
      const { accessToken, scopes, expiresAt } =
        await seedActiveGoogleToken(email)
      const messageCount = faker.number.int({ min: 100, max: 5000 })
      const unreadCount = faker.number.int({ min: 0, max: 99 })
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

      const expectedHtml = renderProfile([
        {
          provider: "google",
          email,
          scopes,
          expiresAt,
          active: true,
          stats: { folder: "INBOX", messageCount, unreadCount },
          statsError: null,
        },
      ])

      await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)
        .expect(expectedHtml)
    })

    it("should NOT leak the access token into the rendered HTML", async () => {
      const email = faker.internet.email().toLowerCase()
      const { accessToken } = await seedActiveGoogleToken(email)
      await gmailClient.expectLabel({
        labelId: "INBOX",
        token: accessToken,
        label: gmail.label({ id: "INBOX" }),
      })

      const cookie = await authenticate(app, email)

      await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)
        .expect((res) => {
          expect(res.text).not.toContain(accessToken)
        })
    })
  })

  describe("Given a user with no google OAuthToken", () => {
    it('should respond with HTTP 200 and render the profile template with "No third-party accounts connected."', async () => {
      const email = faker.internet.email().toLowerCase()
      const cookie = await authenticate(app, email)

      const expectedHtml = renderProfile([])

      await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)
        .expect(expectedHtml)
    })
  })

  describe("Given a user with a google token whose scopes do not include gmail.readonly", () => {
    it("should respond with HTTP 200 and render the profile template with a row and no stats", async () => {
      const email = faker.internet.email().toLowerCase()
      const { scopes, expiresAt } = await seedActiveGoogleToken(email, {
        scopes: google.sensibleScopes(),
      })

      const cookie = await authenticate(app, email)

      const expectedHtml = renderProfile([
        {
          provider: "google",
          email,
          scopes,
          expiresAt,
          active: true,
          stats: null,
          statsError: null,
        },
      ])

      await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)
        .expect(expectedHtml)
    })
  })

  describe("Given a user with an expired google token", () => {
    it("should respond with HTTP 200 and render the profile template with an Expired row and no stats", async () => {
      const email = faker.internet.email().toLowerCase()
      const expiredAt = new Date(Date.now() - 60 * 1000)
      const { scopes } = await seedActiveGoogleToken(email, {
        expiresAt: expiredAt,
      })

      const cookie = await authenticate(app, email)

      const expectedHtml = renderProfile([
        {
          provider: "google",
          email,
          scopes,
          expiresAt: expiredAt,
          active: false,
          stats: null,
          statsError: null,
        },
      ])

      await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)
        .expect(expectedHtml)
    })
  })

  describe("Given Gmail responds with HTTP 500", () => {
    it('should respond with HTTP 200 and render the profile template with "Unavailable" cells', async () => {
      const email = faker.internet.email().toLowerCase()
      const { accessToken, scopes, expiresAt } =
        await seedActiveGoogleToken(email)
      await gmailClient.expectLabelError({
        labelId: "INBOX",
        token: accessToken,
        statusCode: 500,
        message: "Internal Server Error",
      })

      const cookie = await authenticate(app, email)

      const expectedHtml = renderProfile([
        {
          provider: "google",
          email,
          scopes,
          expiresAt,
          active: true,
          stats: null,
          statsError: "unavailable",
        },
      ])

      await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)
        .expect(expectedHtml)
    })
  })

  describe("Given the Gmail fetch is dropped (network failure)", () => {
    it('should respond with HTTP 200 and render the profile template with "Unavailable" cells', async () => {
      const email = faker.internet.email().toLowerCase()
      const { accessToken, scopes, expiresAt } =
        await seedActiveGoogleToken(email)
      await gmailClient.expectNetworkFailure({
        labelId: "INBOX",
        token: accessToken,
      })

      const cookie = await authenticate(app, email)

      const expectedHtml = renderProfile([
        {
          provider: "google",
          email,
          scopes,
          expiresAt,
          active: true,
          stats: null,
          statsError: "unavailable",
        },
      ])

      await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)
        .expect(expectedHtml)
    })
  })
})
