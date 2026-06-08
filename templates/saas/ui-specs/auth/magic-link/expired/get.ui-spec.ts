import { expect, test } from "@playwright/test"

test.describe("Magic Link Expired Page", () => {
  test.describe("When a visitor uses an invalid magic link token", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/auth/magic-link/callback?token=invalid-token")
    })

    test("should display the expired heading", async ({ page }) => {
      const heading = page.getByRole("heading", { level: 1 })
      await expect(heading).toHaveText("Link expired")
    })

    test("should display an explanation message", async ({ page }) => {
      await expect(
        page.getByText(/invalid or has expired/i),
      ).toBeVisible()
    })

    test("should display a try again link back to registration", async ({
      page,
    }) => {
      await page.getByRole("link", { name: /try again/i }).click()
      await expect(page).toHaveURL("/auth/register")
    })
  })
})
