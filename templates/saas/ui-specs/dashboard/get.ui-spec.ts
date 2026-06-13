import { faker } from "@faker-js/faker"

import { expect, test } from "../../fixtures/auth/test"

test.describe("Dashboard Page", () => {
  test.describe("When an unauthenticated visitor navigates to the dashboard", () => {
    test("should redirect to the registration page", async ({ page }) => {
      await page.goto("/dashboard")
      await expect(page).toHaveURL("/auth/register")
    })
  })

  test.describe("When an authenticated user visits the dashboard", () => {
    let email: string

    test.beforeEach(async ({ login, page }) => {
      email = faker.internet.email()
      await login.as(email)
      await page.goto("/dashboard")
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

    test("should show the user's avatar in the navigation", async ({
      page,
    }) => {
      const avatar = page.getByRole("img", { name: "Profile" })
      await expect(avatar).toHaveAttribute("src", "/profile/avatar")
    })

    test("should take the user to the profile page when the nav avatar is clicked", async ({
      page,
    }) => {
      const link = page.getByRole("link", { name: "Profile" })
      await link.click()
      await expect(page).toHaveURL("/profile")
    })
  })
})
