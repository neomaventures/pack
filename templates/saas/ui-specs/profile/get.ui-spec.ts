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

    test("should display the default avatar image", async ({ page }) => {
      await page.goto("/profile")
      const avatar = page.getByRole("img", { name: "Your avatar" })
      await expect(avatar).toHaveAttribute("src", "/profile/avatar")
    })

    test("should display the nav avatar", async ({ page }) => {
      await page.goto("/profile")
      const avatar = page.getByRole("img", { name: "Profile" })
      await expect(avatar).toHaveAttribute("src", "/profile/avatar")
    })

    test("should navigate to the profile page when the nav avatar is clicked", async ({
      page,
    }) => {
      await page.goto("/profile")
      const link = page.getByRole("link", { name: "Profile" })
      await link.click()
      await expect(page).toHaveURL("/profile")
    })

    test("should display the avatar upload form with a file input and submit button", async ({
      page,
    }) => {
      await page.goto("/profile")

      const fileInput = page.locator('input[type="file"][name="file"]')
      await expect(fileInput).toBeVisible()

      const submitButton = page.getByRole("button", { name: /upload/i })
      await expect(submitButton).toBeVisible()
    })

    test("should round-trip a valid upload back to /profile with a presigned avatar URL", async ({
      page,
    }) => {
      await page.goto("/profile")

      // 1×1 transparent PNG — smallest valid PNG buffer.
      const pngBuffer = Buffer.from(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4" +
          "890000000d49444154789c626001000000050001a7c66ec00000000049454e44ae426082",
        "hex",
      )

      await page.locator('input[type="file"][name="file"]').setInputFiles({
        name: "avatar.png",
        mimeType: "image/png",
        buffer: pngBuffer,
      })
      await page.getByRole("button", { name: /upload/i }).click()

      await expect(page).toHaveURL("/profile")

      const avatar = page.getByRole("img", { name: "Your avatar" })
      await expect(avatar).toHaveAttribute("src", "/profile/avatar")

      // Stronger assertion: GET /profile/avatar resolves to a presigned URL,
      // not the default SVG. The browser cache doesn't apply to a fresh
      // page.request — this proves the upload succeeded server-side.
      const avatarResponse = await page.request.get("/profile/avatar", {
        maxRedirects: 0,
      })
      expect(avatarResponse.status()).toBe(302)
      const location = avatarResponse.headers()["location"]
      expect(location).not.toBe("/img/default-avatar.svg")
      expect(location).toMatch(/^https?:\/\//)
    })

    test("should re-render the form with an error when an unsupported file type is uploaded", async ({
      page,
    }) => {
      await page.goto("/profile")

      await page.locator('input[type="file"][name="file"]').setInputFiles({
        name: "doc.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 fake pdf"),
      })
      await page.getByRole("button", { name: /upload/i }).click()

      // Page re-renders the profile view in-place at /profile/avatar
      // (no PRG on error — matches the auth module's register pattern,
      // where the validation error re-renders at the POST URL).
      await expect(page).toHaveURL("/profile/avatar")

      // Inline error visible in the upload section.
      const error = page.getByText(/not supported/i)
      await expect(error).toBeVisible()

      // The form is still present so the user can try again.
      await expect(
        page.locator('input[type="file"][name="file"]'),
      ).toBeVisible()
    })
  })
})
