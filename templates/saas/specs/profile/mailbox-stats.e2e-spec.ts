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

const { OK, BAD_GATEWAY } = HttpStatus

const profileTemplatePath = join(process.cwd(), "views", "profile.ejs")
const profileTemplate = readFileSync(profileTemplatePath, "utf-8")

describe("GET /profile - mailbox stats section", () => {
  const gmailClient = new GmailClient(mockserver)
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({ configure: configureViewEngine })
  })

  const loadAccount = async (email: string): Promise<Account> =>
    app
      .get(DataSource)
      .getRepository(Account)
      .findOneOrFail({
        where: { email: email.toLowerCase() },
        relations: ["oauthTokens"],
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
  ): Promise<{ accessToken: string }> => {
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
    return { accessToken }
  }

  describe("Given an authenticated account with an active google token and mailbox stats available", () => {
    it(`should respond with HTTP ${OK} and render the profile template with the stats`, async () => {
      const email = faker.internet.email().toLowerCase()
      const { accessToken } = await seedActiveGoogleToken(email)
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
      const account = await loadAccount(email)

      const expectedHtml = ejs.render(
        profileTemplate,
        {
          npmPackageName,
          npmPackageVersion,
          account,
          mailboxStats: {
            folder: "INBOX",
            messageCount,
            unreadCount,
          },
        },
        { filename: profileTemplatePath },
      )

      await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)
        .expect("Content-Type", /text\/html/)
        .expect(expectedHtml)
    })
  })

  describe("Given an authenticated account without an active google token", () => {
    it(`should respond with HTTP ${OK} and render the profile template with mailboxStats: null`, async () => {
      const email = faker.internet.email().toLowerCase()
      const cookie = await authenticate(app, email)
      const account = await loadAccount(email)

      const expectedHtml = ejs.render(
        profileTemplate,
        {
          npmPackageName,
          npmPackageVersion,
          account,
          mailboxStats: null,
        },
        { filename: profileTemplatePath },
      )

      await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)
        .expect("Content-Type", /text\/html/)
        .expect(expectedHtml)
    })
  })

  describe("Given the upstream Gmail API errors", () => {
    it(`should respond with HTTP ${BAD_GATEWAY} and re-render the profile template with the exception banner`, async () => {
      const email = faker.internet.email().toLowerCase()
      const { accessToken } = await seedActiveGoogleToken(email)
      await gmailClient.expectLabelError({
        labelId: "INBOX",
        token: accessToken,
        statusCode: 500,
        message: "Internal Server Error",
      })
      const cookie = await authenticate(app, email)
      const account = await loadAccount(email)

      const expectedHtml = ejs.render(
        profileTemplate,
        {
          npmPackageName,
          npmPackageVersion,
          account,
          exception: {
            statusCode: BAD_GATEWAY,
            message: "Bad Gateway",
            error: "MailboxApi",
          },
        },
        { filename: profileTemplatePath },
      )

      await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(BAD_GATEWAY)
        .expect("Content-Type", /text\/html/)
        .expect(expectedHtml)
    })
  })
})
