import { expect, test } from "@playwright/test"

test.describe("Registration Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/register")
  })

  test.describe("When a visitor navigates to /auth/register", () => {
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

    test("should navigate to / when the back link is clicked", async ({
      page,
    }) => {
      await page.getByRole("link", { name: /back/i }).click()
      await expect(page).toHaveURL("/")
    })
  })

  test.describe("When a visitor submits a valid email", () => {
    test("should navigate to the magic-link-sent page", async ({ page }) => {
      await page.getByLabel("Email address").fill("test@example.com")
      await page.getByRole("button", { name: "Continue with email" }).click()

      await expect(page).toHaveURL(/\/auth\/magic-link\/sent/)
    })
  })

  test.describe("When a visitor submits an invalid email", () => {
    test("should re-render the form with an error message visible", async ({
      page,
    }) => {
      const emailInput = page.getByLabel("Email address")
      await emailInput.fill("not-an-email")

      const submitButton = page.getByRole("button", {
        name: "Continue with email",
      })
      await submitButton.click()

      const errorMessage = page.getByText("Please enter a valid email address.")
      await expect(errorMessage).toBeVisible()

      await expect(emailInput).toHaveValue("not-an-email")
    })
  })

  // test.describe("When a visitor submits a blank email", () => {
  //   test("should re-render the form with an error message visible", async ({
  //     page,
  //   }) => {
  //     const emailInput = page.getByLabel("Email address")
  //     await emailInput.fill("")
  //
  //     const submitButton = page.getByRole("button", {
  //       name: "Continue with email",
  //     })
  //     await submitButton.click()
  //
  //     const errorMessage = page.getByText("Please enter a valid email address.")
  //     await expect(errorMessage).toBeVisible()
  //
  //     await expect(emailInput).toHaveValue("")
  //   })
  // })
})
