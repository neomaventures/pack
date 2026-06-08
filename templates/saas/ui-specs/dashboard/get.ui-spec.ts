import { faker } from "@faker-js/faker"
import { MailpitClient } from "@neomaventures/mailpit"
import { expect, test } from "@playwright/test"

const mailpit = new MailpitClient(process.env.MAILPIT_API!)

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

test.describe("Dashboard Page", () => {
  test.describe("When an unauthenticated visitor navigates to the dashboard", () => {
    test("should redirect to the registration page", async ({ page }) => {
      await page.goto("/dashboard")
      await expect(page).toHaveURL("/auth/register")
    })
  })

  test.describe("When an authenticated user visits the dashboard", () => {
    let email: string

    test.beforeEach(async ({ page }) => {
      email = faker.internet.email()
      await mailpit.clear()

      await page.goto("/auth/register")
      await page.getByLabel("Email address").fill(email)
      await page.getByRole("button", { name: "Continue with email" }).click()
      await page.waitForURL(/\/auth\/magic-link\/sent/)

      const message = await mailpit.findByRecipient(email)
      const callbackUrl = extractCallbackUrl(message)
      await page.goto(callbackUrl.toString())
      await page.waitForURL("/dashboard")
    })

    test("should display the Dashboard heading", async ({ page }) => {
      const heading = page.getByRole("heading", { level: 1 })
      await expect(heading).toHaveText("Dashboard")
    })

    test("should display the user's email address", async ({ page }) => {
      await expect(page.getByText(email.toLowerCase())).toBeVisible()
    })

    test("should display a Sign out button", async ({ page }) => {
      const button = page.getByRole("button", { name: "Sign out" })
      await expect(button).toBeVisible()
    })
  })
})
