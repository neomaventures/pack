import { MailpitClient } from "@neomaventures/mailpit"
import { createTransport } from "nodemailer"

/**
 * End-to-end check against a real container, consuming the package the way
 * an installer would: imports resolve to the built `dist` at runtime (see
 * e2e/jest-e2e.json), and the container is started by the built `setup`
 * drop-in (globalSetup, via dist/setup.js). Types still resolve to `src`
 * (tsconfig paths) so goto-definition and debugging stay on source.
 *
 * The e2e script sets MAILPIT_SMTP_PORT and MAILPIT_API_PORT;
 * startContainer reads them for the host ports.
 */
describe("@neomaventures/mailpit (e2e)", () => {
  const smtpPort = Number(process.env.MAILPIT_SMTP_PORT ?? "1025")
  const apiPort = Number(process.env.MAILPIT_API_PORT ?? "8025")
  let client: MailpitClient

  beforeAll(() => {
    client = new MailpitClient(`http://localhost:${apiPort}/api/v1`)
  })

  beforeEach(async () => {
    await client.clear()
  })

  it("captures an SMTP email and reads it back through the client", async () => {
    const transport = createTransport({
      host: "localhost",
      port: smtpPort,
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
