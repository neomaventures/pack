import { MailpitClient } from "@neomaventures/mailpit"

/**
 * Shared Mailpit client for test suites.
 *
 * Reads `MAILPIT_API` from the environment (set by the global setup)
 * and clears all messages before each test via a `beforeEach` hook.
 */
export const mailpit = new MailpitClient(process.env.MAILPIT_API!)

if (typeof beforeEach === "function") {
  beforeEach(async () => {
    await mailpit.clear()
  })
}
