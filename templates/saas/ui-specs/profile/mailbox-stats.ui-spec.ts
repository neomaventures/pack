import { faker } from "@faker-js/faker"
import { gmail, GmailClient, google } from "@neomaventures/google-fixtures"
import { GMAIL_READONLY_SCOPE } from "@neomaventures/mailbox"
import { mockserver } from "@neomaventures/mockserver/fixture"

import { expect, test } from "../../fixtures/auth/test"

test.describe("Profile Page — Connected accounts", () => {
  let gmailClient: GmailClient

  test.beforeEach(async () => {
    // Playwright Test does not expose a global beforeEach, so the singleton's
    // auto-reset hook does not fire here. Reset explicitly to preserve
    // isolation between tests in this suite.
    await mockserver.reset()
    gmailClient = new GmailClient(mockserver)
  })

  test.describe("Given a magic-link-only user (no Google auth)", () => {
    test('should render "No third-party accounts connected."', async ({
      login,
      page,
    }) => {
      const email = faker.internet.email()
      await login.viaMagicLink(email)
      await page.goto("/profile")

      await expect(
        page.getByRole("heading", { name: "Connected accounts" }),
      ).toBeVisible()
      await expect(
        page.getByText("No third-party accounts connected."),
      ).toBeVisible()
    })
  })

  test.describe("Given a Google-authenticated user with gmail.readonly and a successful Gmail response", () => {
    test("should render a row for the Google account with the message + unread counts", async ({
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

      const row = page.getByRole("row", { name: new RegExp(email, "i") })
      await expect(row).toBeVisible()
      await expect(row.getByText("Google")).toBeVisible()
      await expect(row.getByText("Active")).toBeVisible()
      await expect(
        row.getByRole("cell", { name: String(messageCount) }),
      ).toBeVisible()
      await expect(
        row.getByRole("cell", { name: String(unreadCount) }),
      ).toBeVisible()
    })
  })

  test.describe("Given a Google-authenticated user with gmail.readonly but Gmail errors", () => {
    test('should render the row with "Unavailable" cells when Gmail returns HTTP 500', async ({
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

      const row = page.getByRole("row", { name: new RegExp(email, "i") })
      await expect(row.getByText("Unavailable").first()).toBeVisible()
    })

    test('should render the row with "Unavailable" cells when the Gmail fetch is dropped at the network layer', async ({
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

      const row = page.getByRole("row", { name: new RegExp(email, "i") })
      await expect(row.getByText("Unavailable").first()).toBeVisible()
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
        scopes: google.sensibleScopes([GMAIL_READONLY_SCOPE]),
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

      const row = page.getByRole("row", { name: new RegExp(email, "i") })
      await expect(
        row.getByRole("cell", { name: String(messageCount) }),
      ).toBeVisible()
      await expect(
        row.getByRole("cell", { name: String(unreadCount) }),
      ).toBeVisible()
    })
  })
})
