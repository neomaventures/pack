import { MailpitClient } from "@neomaventures/mailpit"

/**
 * Shared Mailpit client for test suites.
 *
 * Reads `MAILPIT_API` from the environment (declared in `.env.e2e-spec`
 * and `.env.ui-spec`) and clears all messages before each test via a
 * `beforeEach` hook.
 */
export const mailpit = new MailpitClient(process.env.MAILPIT_API!)

if (typeof beforeEach === "function") {
  beforeEach(async () => {
    await mailpit.clear()
  })
}
