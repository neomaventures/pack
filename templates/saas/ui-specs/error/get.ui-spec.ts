import { expect, test } from "@playwright/test"

test.describe("Error Page (render mode)", () => {
  test.describe("When a visitor navigates to /error?type=render", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/error?type=render")
    })

    test("should display the error heading", async ({ page }) => {
      const heading = page.getByRole("heading", { level: 1 })
      await expect(heading).toHaveText("Something went wrong")
    })

    test("should display the status code", async ({ page }) => {
      const statusCode = page.getByText("500")
      await expect(statusCode).toBeVisible()
    })

    test("should display a back to home link", async ({ page }) => {
      const link = page.getByRole("link", { name: "Back to home" })
      await expect(link).toBeVisible()
    })
  })
})

test.describe("Error Redirect (redirect mode)", () => {
  test.describe("When a visitor navigates to /error?type=redirect", () => {
    test("should redirect to the welcome page", async ({ page }) => {
      await page.goto("/error?type=redirect")
      await expect(page).toHaveURL("/")

      const heading = page.getByRole("heading", { level: 1 })
      await expect(heading).toHaveText("Welcome to __PACKAGE_NAME__")
    })
  })
})
