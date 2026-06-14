import { MailpitClient } from "@neomaventures/mailpit"
import { test as base } from "@playwright/test"

import { extractCallbackUrl } from "../email/content"

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
 *
 * `viaGoogle` deliberately omitted — the Google flow is already tested
 * at the source by `ui-specs/auth/google/callback.ui-spec.ts`. No
 * downstream spec needs "I am logged in via Google specifically." Add
 * back when a real consumer surfaces.
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

    await use({
      as: performMagicLink,
      viaMagicLink: performMagicLink,
    })
  },
})

export { expect } from "@playwright/test"
