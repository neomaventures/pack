import { faker } from "@faker-js/faker"
import { MailpitClient } from "@neomaventures/mailpit"
import { expect, test } from "@playwright/test"

const mailpit = new MailpitClient(process.env.MAILPIT_API ?? "http://localhost:8025")

/**
 * Extracts the callback URL from the magic link email HTML.
 */
function extractCallbackUrl(message: { HTML: string }): URL {
  const href = message.HTML.match(/href="([^"]*callback[^"]*)"/)?.[1]
  if (!href) {
    throw new Error("No callback URL found in email HTML")
  }
  return new URL(href)
}

test.describe("Magic Link Callback", () => {
  test.beforeEach(async () => {
    await mailpit.clear()
  })

  test.describe("When a visitor completes the magic link flow", () => {
    const email = faker.internet.email()

    test("should authenticate the user and redirect to /", async ({
      page,
    }) => {
      await page.goto("/auth/register")
      await page.getByLabel("Email address").fill(email)
      await page.getByRole("button", { name: "Continue with email" }).click()
      await page.waitForURL(/\/auth\/magic-link\/sent/)

      const message = await mailpit.findByRecipient(email)
      const callbackUrl = extractCallbackUrl(message)
      await page.goto(callbackUrl.toString())

      await expect(page).toHaveURL("/")
    })
  })

  test.describe("When an invalid token is used", () => {
    test("should redirect to the registration page", async ({ page }) => {
      await page.goto("/auth/magic-link/callback?token=invalid-token")

      await expect(page).toHaveURL("/auth/register")
    })
  })
})
