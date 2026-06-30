import { faker } from "@faker-js/faker"
import { gmail, GmailClient, google } from "@neomaventures/google-fixtures"
import { GMAIL_READONLY_SCOPE } from "@neomaventures/mailbox"
import { mockserver } from "@neomaventures/mockserver/fixture"

import { expect, test } from "../../fixtures/auth/test"

test.describe("Profile Page — Mailbox section", () => {
  let gmailClient: GmailClient

  test.beforeEach(async () => {
    // Playwright Test does not expose a global beforeEach, so the singleton's
    // auto-reset hook does not fire here. Reset explicitly to preserve
    // isolation between tests in this suite.
    await mockserver.reset()
    gmailClient = new GmailClient(mockserver)
  })

  test.describe("Given a magic-link-only user (no Google auth)", () => {
    test('should render the Mailbox heading and the "not connected" CTA, with no connected accounts', async ({
      login,
      page,
    }) => {
      const email = faker.internet.email()
      await login.viaMagicLink(email)
      await page.goto("/profile")

      const section = page.locator('[data-section="mailbox"]')
      await expect(section.getByRole("heading", { level: 2 })).toHaveText(
        "Mailbox",
      )
      await expect(
        section.locator('[data-test="mailbox-not-connected"]'),
      ).toBeVisible()
      await expect(page.locator('[data-provider="google"]')).toHaveCount(0)
    })
  })

  test.describe("Given a Google-authenticated user with gmail.readonly and a successful Gmail response", () => {
    test("should render the mailbox-message-count and mailbox-unread-count spans with the upstream label values", async ({
      login,
      page,
    }) => {
      const email = faker.internet.email()
      const { accessToken } = await login.viaGoogle(email)
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

      await page.goto("/profile")

      const section = page.locator('[data-section="mailbox"]')
      await expect(
        section.locator('[data-test="mailbox-message-count"]'),
      ).toHaveText(String(messageCount))
      await expect(
        section.locator('[data-test="mailbox-unread-count"]'),
      ).toHaveText(String(unreadCount))
    })
  })

  test.describe("Given a Google-authenticated user with gmail.readonly but Gmail errors", () => {
    test('should render the "unavailable" state when Gmail returns HTTP 500', async ({
      login,
      page,
    }) => {
      const email = faker.internet.email()
      const { accessToken } = await login.viaGoogle(email)
      await gmailClient.expectLabelError({
        labelId: "INBOX",
        token: accessToken,
        statusCode: 500,
        message: "Internal Server Error",
      })

      await page.goto("/profile")

      const section = page.locator('[data-section="mailbox"]')
      await expect(
        section.locator('[data-test="mailbox-unavailable"]'),
      ).toBeVisible()
    })

    test('should render the "unavailable" state when the Gmail fetch is dropped at the network layer', async ({
      login,
      page,
    }) => {
      const email = faker.internet.email()
      const { accessToken } = await login.viaGoogle(email)
      await gmailClient.expectNetworkFailure({
        labelId: "INBOX",
        token: accessToken,
      })

      await page.goto("/profile")

      const section = page.locator('[data-section="mailbox"]')
      await expect(
        section.locator('[data-test="mailbox-unavailable"]'),
      ).toBeVisible()
    })
  })

  test.describe("Given a user authenticated via both magic-link and Google", () => {
    test("should render the message + unread counts after the Google account is linked", async ({
      login,
      page,
    }) => {
      const email = faker.internet.email()
      // First sign in via magic-link, then link Google to the same email.
      await login.viaMagicLink(email)
      const { accessToken } = await login.viaGoogle(email, {
        scopes: [...google.sensibleScopes(), GMAIL_READONLY_SCOPE],
      })

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

      await page.goto("/profile")

      const section = page.locator('[data-section="mailbox"]')
      await expect(
        section.locator('[data-test="mailbox-message-count"]'),
      ).toHaveText(String(messageCount))
      await expect(
        section.locator('[data-test="mailbox-unread-count"]'),
      ).toHaveText(String(unreadCount))
    })
  })
})
