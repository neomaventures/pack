import { google, GoogleOAuthClient } from "@neomaventures/google-fixtures"
import { GMAIL_READONLY_SCOPE } from "@neomaventures/mailbox"
import { MailpitClient } from "@neomaventures/mailpit"
import { mockserver } from "@neomaventures/mockserver/fixture"
import { test as base } from "@playwright/test"

import { extractCallbackUrl } from "../email/content"

const clientId = process.env.GOOGLE_CLIENT_ID ?? "test-client-id"
const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "test-client-secret"
const appUrl = process.env.APP_URL ?? "http://localhost:3000"
const redirectUri = `${appUrl}/auth/google/callback`

/**
 * Login helpers exposed via the Playwright `login` fixture.
 *
 * Both methods take a required positional `email` and complete with the
 * page authenticated as that user. Browser tests run out-of-process from
 * the app, so unlike the e2e `authenticate` fixture, there
 * is no "fast" path that side-steps the UI — the test process can't
 * insert into the server's `:memory:` SQLite, so the only way to land an
 * authenticated session in the cookie jar is to drive the actual auth UI.
 *
 * - {@link LoginFixture.as} — drives the magic-link UI flow.
 * - {@link LoginFixture.viaMagicLink} — alias for `as`, kept as a verb
 *   for tests that want to be explicit that they're exercising the
 *   magic-link flow (e.g. specs under `ui-specs/auth/magic-link/`).
 * - {@link LoginFixture.viaGoogle} — drives the Google OAuth callback flow.
 *   Used by specs that need a Google-authenticated session, optionally with
 *   `gmail.readonly` granted. The token endpoint is mocked via
 *   {@link GoogleOAuthClient}; the returned access token is exposed so the
 *   spec can register a matching Gmail expectation.
 */
export interface LoginFixture {
  /**
   * Logs the page in as the given email by driving the magic-link UI
   * flow. Leaves the page on `/dashboard`.
   *
   * @param email - The email address to authenticate as.
   */
  as(email: string): Promise<void>

  /**
   * Alias for {@link LoginFixture.as}, kept as an explicit verb for
   * tests that document they're exercising the magic-link flow itself.
   *
   * @param email - The email address to authenticate as.
   */
  viaMagicLink(email: string): Promise<void>

  /**
   * Logs the page in as the given email via the Google OAuth callback,
   * driving a single round-trip against a MockServer expectation. Leaves
   * the page on `/dashboard`.
   *
   * The OAuth code-exchange response embeds the granted scopes; when
   * `gmail.readonly` is included, downstream Gmail-scoped requests through
   * the saas-template's `GmailTokenAccessor` will resolve. The returned
   * `accessToken` is the value the saved `OAuthToken.accessToken` row
   * carries — pass it through to `GmailClient.expect*` so the Gmail
   * MockServer expectation matches the bearer the app sends upstream.
   *
   * @param email - The email address to authenticate as.
   * @param options - Optional scope override and account email.
   * @param options.scopes - The granted scopes embedded on the token
   *   response. Defaults to `google.sensibleScopes([GMAIL_READONLY_SCOPE])`.
   * @returns The mocked Google `access_token` so the spec can register
   *   matching Gmail expectations.
   */
  viaGoogle(
    email: string,
    options?: { scopes?: string[] },
  ): Promise<{ accessToken: string }>
}

interface AuthFixtures {
  login: LoginFixture
}

/**
 * Playwright `test` extended with a {@link LoginFixture}.
 *
 * @example
 * ```typescript
 * import { test, expect } from "../../fixtures/auth/test"
 *
 * test("dashboard shows the user's email", async ({ page, login }) => {
 *   const email = faker.internet.email()
 *   await login.as(email)
 *   await page.goto("/dashboard")
 *   await expect(page.getByText(email.toLowerCase())).toBeVisible()
 * })
 * ```
 */
export const test = base.extend<AuthFixtures>({
  login: async ({ page }, use): Promise<void> => {
    const mailpit = new MailpitClient(process.env.MAILPIT_API!)

    const performMagicLink = async (email: string): Promise<void> => {
      await mailpit.clear()
      await page.goto("/auth/register")
      await page.getByLabel("Email address").fill(email)
      await page.getByRole("button", { name: "Continue with email" }).click()
      await page.waitForURL(/\/auth\/magic-link\/sent/)

      const message = await mailpit.findByRecipient(email)
      const callbackUrl = extractCallbackUrl(message)
      await page.goto(callbackUrl.toString())
      await page.waitForURL("/dashboard")
    }

    const performGoogle = async (
      email: string,
      options: { scopes?: string[] } = {},
    ): Promise<{ accessToken: string }> => {
      const scopes =
        options.scopes ?? google.sensibleScopes([GMAIL_READONLY_SCOPE])
      const googleOAuth = new GoogleOAuthClient(mockserver)
      const code = google.code()
      const tokenResponse = await googleOAuth.mockCodeExchange({
        code,
        clientId,
        clientSecret,
        redirectUri,
        idToken: google.idToken({ email }),
        refreshToken: google.refreshToken(),
        scopes,
      })

      await page.goto(`/auth/google/callback?code=${encodeURIComponent(code)}`)
      await page.waitForURL("/dashboard")

      return { accessToken: tokenResponse.access_token }
    }

    await use({
      as: performMagicLink,
      viaMagicLink: performMagicLink,
      viaGoogle: performGoogle,
    })
  },
})

export { expect } from "@playwright/test"
