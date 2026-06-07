import { expect, test } from "@playwright/test"

test.describe("Error Page (render mode)", () => {
  test.describe("When a visitor navigates to /?error=true", () => {
    test.beforeEach(({ page }) => {
      return page.goto("/?error=true")
    })

    test("should display the error heading", async ({ page }) => {
      const heading = page.getByRole("heading", { level: 1 })
      await expect(heading).toHaveText("Something went wrong")
    })

    test("should display the status code and message", async ({ page }) => {
      const subtitle = page.getByText("500")
      await expect(subtitle).toBeVisible()
    })

    test("should display a back to home link", async ({ page }) => {
      const link = page.getByRole("link", { name: "Back to home" })
      await expect(link).toBeVisible()
    })
  })
})

test.describe("Redirect Error (redirect mode)", () => {
  test.describe("When a visitor navigates to /redirect-error", () => {
    test("should redirect to the welcome page", async ({ page }) => {
      await page.goto("/redirect-error")
      await expect(page).toHaveURL("/")

      const heading = page.getByRole("heading", { level: 1 })
      await expect(heading).toHaveText("Welcome to __PACKAGE_NAME__")
    })
  })
})
