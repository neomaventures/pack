import { faker } from "@faker-js/faker"
import { createTransport, type Transporter } from "nodemailer"

import { startMailpit, stopMailpit, type MailpitConfig } from "../docker"

import { MailpitClient } from "./client"

/**
 * Sends a test email via the given nodemailer transport.
 */
async function sendEmail(
  transport: Transporter,
  { to, subject, html }: { to: string; subject: string; html: string },
): Promise<void> {
  await transport.sendMail({
    from: faker.internet.email(),
    to,
    subject,
    html,
  })
}

describe("MailpitClient", () => {
  const prefix = `neoma-test-mpc-${faker.string.alphanumeric(4)}`
  const smtpPort = 14_025 + faker.number.int({ min: 0, max: 999 })
  const apiPort = 22_025 + faker.number.int({ min: 0, max: 999 })
  let config: MailpitConfig
  let client: MailpitClient
  let transport: Transporter

  beforeAll(async () => {
    config = await startMailpit({ prefix, smtpPort, apiPort })
    client = new MailpitClient(`http://localhost:${config.apiPort}/api/v1`)
    transport = createTransport({
      host: "localhost",
      port: config.smtpPort,
      secure: false,
    })
  }, 60_000)

  afterAll(async () => {
    await stopMailpit({ prefix })
    delete process.env.SMTP_HOST
    delete process.env.SMTP_PORT
    delete process.env.MAILPIT_API
  })

  beforeEach(async () => {
    await client.clear()
  })

  describe("clear()", () => {
    it("should remove all messages", async () => {
      const to = faker.internet.email()
      const subject = faker.lorem.sentence()
      const html = `<p>${faker.lorem.paragraph()}</p>`

      await sendEmail(transport, { to, subject, html })

      const before = await client.messages()
      expect(before.messages.length).toBeGreaterThan(0)

      await client.clear()

      const after = await client.messages()
      expect(after.messages).toHaveLength(0)
    })
  })

  describe("messages()", () => {
    it("should return all sent messages", async () => {
      const email1 = faker.internet.email()
      const email2 = faker.internet.email()
      const subject1 = faker.lorem.sentence()
      const subject2 = faker.lorem.sentence()

      await sendEmail(transport, {
        to: email1,
        subject: subject1,
        html: "<p>first</p>",
      })
      await sendEmail(transport, {
        to: email2,
        subject: subject2,
        html: "<p>second</p>",
      })

      const result = await client.messages()

      expect(result.messages).toHaveLength(2)
    })
  })

  describe("message(id)", () => {
    it("should return the full message details including HTML and Subject", async () => {
      const to = faker.internet.email()
      const subject = faker.lorem.sentence()
      const html = `<p>${faker.lorem.paragraph()}</p>`

      await sendEmail(transport, { to, subject, html })

      const list = await client.messages()
      const id = list.messages[0].ID as string
      const full = await client.message(id)

      expect(full.Subject).toBe(subject)
      expect(full.HTML).toContain(html)
    })
  })

  describe("findByRecipient(email)", () => {
    it("should find a message by recipient email", async () => {
      const to = faker.internet.email()
      const subject = faker.lorem.sentence()
      const html = `<p>${faker.lorem.paragraph()}</p>`

      await sendEmail(transport, { to, subject, html })

      const found = await client.findByRecipient(to)

      expect(found.Subject).toBe(subject)
      expect(found.HTML).toContain(html)
    })

    it("should match recipients case-insensitively", async () => {
      const to = faker.internet.email()
      const subject = faker.lorem.sentence()

      await sendEmail(transport, {
        to,
        subject,
        html: "<p>case test</p>",
      })

      const found = await client.findByRecipient(to.toUpperCase())

      expect(found.Subject).toBe(subject)
    })

    it("should throw when no message matches the recipient", async () => {
      const nonExistent = faker.internet.email()

      await expect(client.findByRecipient(nonExistent)).rejects.toThrow(
        `No email found for recipient: ${nonExistent}`,
      )
    })
  })
})
