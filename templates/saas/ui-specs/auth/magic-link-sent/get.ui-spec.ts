import { faker } from "@faker-js/faker"
import { expect, test } from "@playwright/test"

const email = faker.internet.email()

test.describe("Magic Link Sent Page", () => {
  test.describe("When a visitor navigates to the confirmation page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(
        `/auth/magic-link/sent?email=${encodeURIComponent(email)}`,
      )
    })

    test("should display the confirmation heading", async ({ page }) => {
      const heading = page.getByRole("heading", { level: 1 })
      await expect(heading).toHaveText("Check your email")
    })

    test("should display the submitted email address", async ({ page }) => {
      await expect(page.getByText(email)).toBeVisible()
    })

    test("should display a try again link back to registration", async ({
      page,
    }) => {
      await page.getByRole("link", { name: /try again/i }).click()
      await expect(page).toHaveURL("/auth/register")
    })
  })
})
