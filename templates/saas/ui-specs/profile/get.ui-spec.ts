import { faker } from "@faker-js/faker"

import { expect, test } from "../../fixtures/auth/test"

test.describe("Profile Page", () => {
  test.describe("When an unauthenticated visitor navigates to the profile page", () => {
    test("should redirect to the registration page", async ({ page }) => {
      await page.goto("/profile")
      await expect(page).toHaveURL("/auth/register")
    })
  })

  test.describe("When an authenticated user visits the profile page", () => {
    test.beforeEach(async ({ login }) => {
      const email = faker.internet.email()
      await login.as(email)
    })

    test("should display the Profile heading", async ({ page }) => {
      await page.goto("/profile")
      const heading = page.getByRole("heading", { level: 1 })
      await expect(heading).toHaveText("Profile")
    })
  })
})
