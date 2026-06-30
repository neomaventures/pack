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

const { BAD_GATEWAY, OK } = HttpStatus

describe("GET /profile - mailbox stats section", () => {
  const gmailClient = new GmailClient(mockserver)
  let app: Awaited<ReturnType<typeof managedAppInstance>>

  beforeEach(async () => {
    app = await managedAppInstance({ configure: configureViewEngine })
  })

  const seedActiveGoogleToken = async (
    email: string,
    options: {
      accessToken?: string
      scopes?: string[]
      expiresAt?: Date
    } = {},
  ): Promise<{ account: Account; accessToken: string }> => {
    const datasource = app.get(DataSource)
    const accounts = datasource.getRepository(Account)
    const tokens = datasource.getRepository(OAuthToken)

    const account = await accounts.save(
      accounts.create({ email: email.toLowerCase(), permissions: [] }),
    )
    const accessToken = options.accessToken ?? faker.string.alphanumeric(40)
    await tokens.save(
      tokens.create({
        account,
        provider: "google",
        accessToken,
        refreshToken: faker.string.alphanumeric(40),
        expiresAt: options.expiresAt ?? new Date(Date.now() + 3600 * 1000),
        scopes: options.scopes ?? [
          "openid",
          "email",
          "profile",
          GMAIL_READONLY_SCOPE,
        ],
      }),
    )
    return { account, accessToken }
  }

  describe("Given a user with an active google token covering gmail.readonly and a successful Gmail response", () => {
    it('should respond with HTTP 200 and HTML containing data-mailbox-state="connected" with the message + unread counts', async () => {
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
      const res = await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)

      const html = res.text
      expect(html).toContain('data-mailbox-state="connected"')
      expect(html).toContain(`${messageCount} messages`)
      expect(html).toContain(`${unreadCount} unread`)
    })
  })

  describe("Given a user with no google OAuthToken", () => {
    it('should respond with HTTP 200 and HTML containing data-mailbox-state="not_connected"', async () => {
      const email = faker.internet.email().toLowerCase()
      const cookie = await authenticate(app, email)

      const res = await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)

      expect(res.text).toContain('data-mailbox-state="not_connected"')
    })

    it("should NOT call the upstream Gmail endpoint", async () => {
      const email = faker.internet.email().toLowerCase()
      const cookie = await authenticate(app, email)

      await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)

      // No expectation was registered on the mockserver; if mailbox had
      // called through, the request would have 404'd from mockserver and
      // the page would have rendered the unavailable state instead.
    })
  })

  describe("Given a user with a google token whose scopes do not include gmail.readonly", () => {
    it('should respond with HTTP 200 and HTML containing data-mailbox-state="not_connected"', async () => {
      const email = faker.internet.email().toLowerCase()
      await seedActiveGoogleToken(email, {
        scopes: ["openid", "email", "profile"],
      })

      const cookie = await authenticate(app, email)
      const res = await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)

      expect(res.text).toContain('data-mailbox-state="not_connected"')
    })
  })

  describe("Given a user with an expired google token", () => {
    it('should respond with HTTP 200 and HTML containing data-mailbox-state="not_connected"', async () => {
      const email = faker.internet.email().toLowerCase()
      await seedActiveGoogleToken(email, {
        expiresAt: new Date(Date.now() - 60 * 1000),
      })

      const cookie = await authenticate(app, email)
      const res = await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(OK)

      expect(res.text).toContain('data-mailbox-state="not_connected"')
    })
  })

  describe("Given Gmail responds with HTTP 500", () => {
    it('should respond with HTTP 502 and HTML containing data-mailbox-state="unavailable"', async () => {
      const email = faker.internet.email().toLowerCase()
      const { accessToken } = await seedActiveGoogleToken(email)
      await gmailClient.expectLabelError({
        labelId: "INBOX",
        token: accessToken,
        statusCode: 500,
        message: "Internal Server Error",
      })

      const cookie = await authenticate(app, email)
      const res = await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(BAD_GATEWAY)

      expect(res.text).toContain('data-mailbox-state="unavailable"')
    })
  })

  describe("Given the Gmail fetch is dropped (network failure)", () => {
    it('should respond with HTTP 502 and HTML containing data-mailbox-state="unavailable"', async () => {
      const email = faker.internet.email().toLowerCase()
      const { accessToken } = await seedActiveGoogleToken(email)
      await gmailClient.expectNetworkFailure({
        labelId: "INBOX",
        token: accessToken,
      })

      const cookie = await authenticate(app, email)
      const res = await request(app.getHttpServer())
        .get("/profile")
        .set("Cookie", cookie)
        .set("Accept", "text/html")
        .expect(BAD_GATEWAY)

      expect(res.text).toContain('data-mailbox-state="unavailable"')
    })
  })

  describe("Given Gmail responds successfully", () => {
    it("should NOT leak the access token into the rendered HTML", async () => {
      const email = faker.internet.email().toLowerCase()
      const { accessToken } = await seedActiveGoogleToken(email)
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

      expect(res.text).not.toContain(accessToken)
    })
  })
})
