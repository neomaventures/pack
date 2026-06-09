import { faker } from "@faker-js/faker"
import { google, GoogleOAuthClient } from "@neomaventures/google-fixtures"
import { MockServerClient } from "@neomaventures/mockserver"
import { expect, test } from "@playwright/test"

const mockserverUrl =
  process.env.MOCKSERVER_URL ?? "http://localhost:1080/mockserver"
const clientId = process.env.GOOGLE_CLIENT_ID ?? "test-client-id"
const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "test-client-secret"
const appUrl = process.env.APP_URL ?? "http://localhost:3000"
const redirectUri = `${appUrl}/auth/google/callback`

test.describe("Google OAuth Flow", () => {
  let mockServerClient: MockServerClient
  let googleOAuth: GoogleOAuthClient

  test.beforeEach(async () => {
    mockServerClient = new MockServerClient(mockserverUrl)
    googleOAuth = new GoogleOAuthClient(mockServerClient)
    await mockServerClient.reset()
  })

  test.describe("When the registration page is loaded", () => {
    test("should display an enabled 'Continue with Google' link that points to Google", async ({
      page,
    }) => {
      await page.goto("/auth/register")

      const googleLink = page.getByRole("link", {
        name: "Continue with Google",
      })
      await expect(googleLink).toBeVisible()
      await expect(googleLink).toHaveAttribute("href", /accounts\.google\.com/)
    })

    test("the Google link should include the correct client_id and redirect_uri", async ({
      page,
    }) => {
      await page.goto("/auth/register")

      const googleLink = page.getByRole("link", {
        name: "Continue with Google",
      })
      const href = await googleLink.getAttribute("href")
      expect(href).toContain(`client_id=${clientId}`)
      expect(href).toContain(encodeURIComponent(redirectUri))
    })
  })

  test.describe("Given a valid Google OAuth code exchange", () => {
    test("should land on /dashboard after callback", async ({ page }) => {
      const code = google.code()
      const email = faker.internet.email().toLowerCase()

      await googleOAuth.mockCodeExchange({
        code,
        clientId,
        clientSecret,
        redirectUri,
        idToken: google.idToken({ email }),
      })

      await page.goto(`/auth/google/callback?code=${encodeURIComponent(code)}`)
      await expect(page).toHaveURL("/dashboard")
    })

    test("returning user should also land on /dashboard", async ({ page }) => {
      const email = faker.internet.email().toLowerCase()

      // First login
      const firstCode = google.code()
      await googleOAuth.mockCodeExchange({
        code: firstCode,
        clientId,
        clientSecret,
        redirectUri,
        idToken: google.idToken({ email }),
      })
      await page.goto(
        `/auth/google/callback?code=${encodeURIComponent(firstCode)}`,
      )
      await expect(page).toHaveURL("/dashboard")

      // Second login
      const secondCode = google.code()
      await googleOAuth.mockCodeExchange({
        code: secondCode,
        clientId,
        clientSecret,
        redirectUri,
        idToken: google.idToken({ email }),
      })
      await page.goto(
        `/auth/google/callback?code=${encodeURIComponent(secondCode)}`,
      )
      await expect(page).toHaveURL("/dashboard")
    })
  })

  test.describe("Given an invalid or unmocked code", () => {
    test("should redirect to /auth/register", async ({ page }) => {
      const code = google.code()

      // No mock registered — the code is invalid
      await page.goto(`/auth/google/callback?code=${encodeURIComponent(code)}`)
      await expect(page).toHaveURL("/auth/register")
    })
  })
})
