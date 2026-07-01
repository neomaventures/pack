import { faker } from "@faker-js/faker"
import { Account, OAuthToken } from "@neomaventures/auth"
import { gmail, GmailClient, google } from "@neomaventures/google-fixtures"
import { GMAIL_READONLY_SCOPE } from "@neomaventures/mailbox"
import { managedAppInstance } from "@neomaventures/managed-app"
import { mockserver } from "@neomaventures/mockserver/fixture"
import { HttpStatus } from "@nestjs/common"
import request from "supertest"
import { DataSource } from "typeorm"

import { authenticate } from "~fixtures/auth/e2e"
import { configureViewEngine } from "~fixtures/configure-view-engine"

const { OK, BAD_GATEWAY } = HttpStatus

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

  describe("Given a user with an active google token covering gmail.readonly and a successful Gmail response", () => {
    it(`should respond with HTTP ${OK} and render the profile template with the message + unread counts`, async () => {
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

      const response = await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)

      expect(response.text).toContain("Connected accounts")
      expect(response.text).toContain(email)
      expect(response.text).toContain("google")
      expect(response.text).toContain("Active")
      expect(response.text).toContain(String(messageCount))
      expect(response.text).toContain(String(unreadCount))
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
    it(`should respond with HTTP ${OK} and render the profile template with "No third-party accounts connected."`, async () => {
      const email = faker.internet.email().toLowerCase()
      const cookie = await authenticate(app, email)

      const response = await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)

      expect(response.text).toContain("No third-party accounts connected.")
    })
  })

  describe("Given a user with an expired google token", () => {
    it(`should respond with HTTP ${OK} and render an Expired row and no stats counts`, async () => {
      const email = faker.internet.email().toLowerCase()
      await seedActiveGoogleToken(email, {
        expiresAt: new Date(Date.now() - 60 * 1000),
      })

      const cookie = await authenticate(app, email)

      // Expired token: the mailbox interceptor will fail (Gmail is not
      // callable without an active token) — GmailTokenAccessor throws
      // GmailNotConnectedException, which is a 200 status. The template
      // renders with the row present, Expired label, no stats cells.
      const response = await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)

      expect(response.text).toContain("Expired")
      expect(response.text).toContain(email)
    })
  })

  describe("Given Gmail responds with HTTP 500", () => {
    it("should re-render the profile template with 'Unavailable' cells and the Connected Accounts row", async () => {
      const email = faker.internet.email().toLowerCase()
      const { accessToken } = await seedActiveGoogleToken(email)
      await gmailClient.expectLabelError({
        labelId: "INBOX",
        token: accessToken,
        statusCode: 500,
        message: "Internal Server Error",
      })

      const cookie = await authenticate(app, email)

      // MailboxApiException wire status is 502. `@ErrorTemplate({ default:
      // "profile" })` re-renders this template with `exception` populated.
      // The template branches: with `exception` set, the stats cells show
      // "Unavailable" but the Connected Accounts row still renders.
      const response = await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(BAD_GATEWAY)
        .expect("Content-Type", /text\/html/)

      expect(response.text).toContain("Connected accounts")
      expect(response.text).toContain(email)
      expect(response.text).toContain("google")
      expect(response.text).toContain("Unavailable")
    })
  })

  describe("Given the Gmail fetch is dropped (network failure)", () => {
    it("should re-render the profile template with 'Unavailable' cells and the Connected Accounts row", async () => {
      const email = faker.internet.email().toLowerCase()
      const { accessToken } = await seedActiveGoogleToken(email)
      await gmailClient.expectNetworkFailure({
        labelId: "INBOX",
        token: accessToken,
      })

      const cookie = await authenticate(app, email)

      const response = await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(BAD_GATEWAY)
        .expect("Content-Type", /text\/html/)

      expect(response.text).toContain("Connected accounts")
      expect(response.text).toContain("Unavailable")
    })
  })
})
