import { expect, test } from "@playwright/test"

test.describe("Dashboard Page", () => {
  test.describe("When a visitor navigates to the dashboard", () => {
    test.beforeEach(({ page }) => {
      return page.goto("/dashboard")
    })

    test("should display the Dashboard heading", async ({ page }) => {
      const heading = page.getByRole("heading", { level: 1 })
      await expect(heading).toHaveText("Dashboard")
    })

    test("should display the signed-in message", async ({ page }) => {
      const message = page.getByText("You are signed in.")
      await expect(message).toBeVisible()
    })

    test("should display a Sign out button", async ({ page }) => {
      const button = page.getByRole("button", { name: "Sign out" })
      await expect(button).toBeVisible()
    })
  })
})
