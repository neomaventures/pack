import { expect, test } from "@playwright/test"

test.describe("Registration Page", () => {
  test.describe("When a visitor navigates to /auth/register", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/auth/register")
    })

    test("should display the page heading", async ({ page }) => {
      const headline = page.getByRole("heading", { level: 1 })
      await expect(headline).toHaveText("Sign up")
    })

    test("should display the email input", async ({ page }) => {
      const emailInput = page.getByLabel("Email address")
      await expect(emailInput).toBeVisible()
    })

    test("should display the magic link submit button", async ({ page }) => {
      const submitButton = page.getByRole("button", {
        name: "Continue with email",
      })
      await expect(submitButton).toBeVisible()
    })

    test("should display the Google button as disabled", async ({ page }) => {
      const googleButton = page.getByRole("button", {
        name: /Google/,
      })
      await expect(googleButton).toBeVisible()
      await expect(googleButton).toBeDisabled()
    })

    test("should navigate to / when back link is clicked", async ({ page }) => {
      await page.getByRole("link", { name: /back/i }).click()
      await expect(page).toHaveURL("/")
    })
  })
})
