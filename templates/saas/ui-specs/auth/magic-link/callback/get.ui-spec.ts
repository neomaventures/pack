import { faker } from "@faker-js/faker"
import { MailpitClient } from "@neomaventures/mailpit"
import { expect, test } from "@playwright/test"

import { extractCallbackUrl } from "../../../../fixtures/email/content"

const mailpit = new MailpitClient(process.env.MAILPIT_API!)

test.describe("Magic Link Callback", () => {
  test.beforeEach(async () => {
    await mailpit.clear()
  })

  test.describe("When a visitor completes the magic link flow", () => {
    const email = faker.internet.email()

    test("should authenticate the user and redirect to /dashboard", async ({ page }) => {
      await page.goto("/auth/register")
      await page.getByLabel("Email address").fill(email)
      await page.getByRole("button", { name: "Continue with email" }).click()
      await page.waitForURL(/\/auth\/magic-link\/sent/)

      const message = await mailpit.findByRecipient(email)
      const callbackUrl = extractCallbackUrl(message)
      await page.goto(callbackUrl.toString())

      await expect(page).toHaveURL("/dashboard")
    })
  })

  test.describe("When an invalid token is used", () => {
    test("should redirect to /auth/magic-link/expired", async ({ page }) => {
      await page.goto("/auth/magic-link/callback?token=invalid-token")
      await expect(page).toHaveURL("/auth/magic-link/expired")
    })
  })
})
