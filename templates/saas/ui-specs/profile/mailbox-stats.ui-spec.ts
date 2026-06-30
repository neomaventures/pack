import { faker } from "@faker-js/faker"

import { expect, test } from "../../fixtures/auth/test"

test.describe("Profile Page — Mailbox section", () => {
  test.describe("When a magic-link-authenticated user visits the profile page", () => {
    test.beforeEach(async ({ login, page }) => {
      const email = faker.internet.email()
      await login.as(email)
      await page.goto("/profile")
    })

    test("should display the Mailbox heading", async ({ page }) => {
      const section = page.locator('[data-section="mailbox"]')
      await expect(section.getByRole("heading", { level: 2 })).toHaveText(
        "Mailbox",
      )
    })

    test("should show the not_connected message when the user has no Google token", async ({
      page,
    }) => {
      const section = page.locator('[data-section="mailbox"]')
      const state = section.locator('[data-mailbox-state="not_connected"]')
      await expect(state).toBeVisible()
    })
  })
})
