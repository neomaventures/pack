import { createTransport } from "nodemailer"

import { MailpitClient } from "@neoma/mailpit"

/**
 * End-to-end check against a real container, consuming the package the way
 * an installer would: imports resolve to the built `dist` at runtime (see
 * e2e/jest-e2e.json), and the container is started by the built `setup`
 * drop-in (globalSetup, via dist/setup.js), which sets SMTP_HOST/SMTP_PORT
 * and MAILPIT_API. Types still resolve to `src` (tsconfig paths) so
 * goto-definition and debugging stay on source.
 */
describe("@neoma/mailpit (e2e)", () => {
  let client: MailpitClient

  beforeAll(() => {
    client = new MailpitClient(process.env.MAILPIT_API as string)
  })

  beforeEach(async () => {
    await client.clear()
  })

  it("captures an SMTP email and reads it back through the client", async () => {
    const transport = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
    })

    await transport.sendMail({
      from: "noreply@example.com",
      to: "alice@example.com",
      subject: "Hello from e2e",
      html: "<p>It works</p>",
    })

    const message = await client.findByRecipient("alice@example.com")

    expect(message.Subject).toBe("Hello from e2e")
    expect(message.HTML).toContain("It works")
  })
})
