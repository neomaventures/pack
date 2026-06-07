import { expect, test } from "@playwright/test"

const email = "test@example.com"

test.describe("Magic Link Sent Page", () => {
  test.describe("When a visitor arrives after submitting a valid email", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/auth/register")
      await page.getByLabel("Email address").fill(email)
      await page.getByRole("button", { name: "Continue with email" }).click()
      await expect(page).toHaveURL(/\/auth\/magic-link\/sent/)
    })

    test("should display the confirmation heading", async ({ page }) => {
      const heading = page.getByRole("heading", { level: 1 })
      await expect(heading).toHaveText("Check your email")
    })

    test("should display the submitted email address", async ({ page }) => {
      await expect(page.getByText(email)).toBeVisible()
    })

    test("should display a try again link back to registration", async ({ page }) => {
      const link = page.getByRole("link", { name: /try again/i })
      await expect(link).toBeVisible()
    })
  })
})
