import { faker } from "@faker-js/faker"
import { google, GoogleOAuthClient } from "@neomaventures/google-fixtures"
import { mockserver } from "@neomaventures/mockserver/fixture"
import { expect, test } from "@playwright/test"

const clientId = process.env.GOOGLE_CLIENT_ID ?? "test-client-id"
const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "test-client-secret"
const appUrl = process.env.APP_URL ?? "http://localhost:3000"
const redirectUri = `${appUrl}/auth/google/callback`

test.describe("Google OAuth Flow", () => {
  let googleOAuth: GoogleOAuthClient

  // Playwright Test does not expose a global `beforeEach`, so the singleton's
  // auto-reset hook does not fire here. Reset explicitly to preserve isolation
  // between tests in this suite.
  test.beforeEach(async () => {
    await mockserver.reset()
    googleOAuth = new GoogleOAuthClient(mockserver)
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

  test.describe("Given the Google code exchange fails", () => {
    test("should redirect to /auth/register", async ({ page }) => {
      const code = google.code()

      // No mock registered — the code is invalid
      await page.goto(`/auth/google/callback?code=${encodeURIComponent(code)}`)
      await expect(page).toHaveURL("/auth/register")
    })
  })
})
