import { type MailpitMessage, type MailpitMessageList } from "./types"

/**
 * HTTP client for interacting with the Mailpit REST API.
 *
 * Provides methods to clear messages, list messages, fetch individual
 * messages, and find messages by recipient. Designed for use in
 * integration and e2e tests.
 *
 * @example
 * ```typescript
 * const client = new MailpitClient("http://localhost:8025/api/v1")
 *
 * // Clear all messages
 * await client.clear()
 *
 * // List all messages
 * const { messages } = await client.messages()
 *
 * // Find a message by recipient
 * const msg = await client.findByRecipient("user@example.com")
 * console.log(msg.Subject, msg.HTML)
 * ```
 */
export class MailpitClient {
  /**
   * @param baseUrl - The Mailpit API v1 base URL
   *   (e.g. `http://localhost:8025/api/v1`)
   */
  public constructor(private readonly baseUrl: string) {}

  /**
   * Deletes all messages from Mailpit.
   *
   * @throws {Error} When the Mailpit API returns a non-2xx response
   *
   * @example
   * ```typescript
   * await client.clear()
   * ```
   */
  public async clear(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "DELETE",
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(
        `Mailpit /messages DELETE returned ${res.status}: ${text}`,
      )
    }
  }

  /**
   * Retrieves all messages from Mailpit.
   *
   * @returns The parsed messages list response
   *
   * @example
   * ```typescript
   * const { messages } = await client.messages()
   * ```
   */
  public async messages(): Promise<MailpitMessageList> {
    const res = await fetch(`${this.baseUrl}/messages`)
    return this.parseResponse(res, "/messages")
  }

  /**
   * Retrieves a single message by ID.
   *
   * @param id - The Mailpit message ID
   * @returns The full message details
   *
   * @example
   * ```typescript
   * const full = await client.message(id)
   * console.log(full.Subject, full.HTML)
   * ```
   */
  public async message(id: string): Promise<MailpitMessage> {
    const res = await fetch(`${this.baseUrl}/message/${id}`)
    return this.parseResponse(res, `/message/${id}`)
  }

  /**
   * Finds the first message sent to a specific recipient.
   *
   * Performs a case-insensitive match on the recipient email address.
   *
   * @param email - The recipient email address to search for
   * @returns The full message details
   * @throws {Error} When no message is found for the given recipient
   *
   * @example
   * ```typescript
   * const msg = await client.findByRecipient("user@example.com")
   * console.log(msg.Subject, msg.HTML)
   * ```
   */
  public async findByRecipient(email: string): Promise<MailpitMessage> {
    const { messages } = await this.messages()
    const match = messages.find((m) =>
      m.To.some((to) => to.Address.toLowerCase() === email.toLowerCase()),
    )
    if (!match) {
      throw new Error(`No email found for recipient: ${email}`)
    }
    return this.message(match.ID)
  }

  /**
   * Parses a Mailpit API response, throwing a descriptive error on non-2xx
   * status codes or non-JSON bodies.
   *
   * @param res - The fetch response to parse
   * @param label - A human-readable label for error messages
   * @returns The parsed JSON body
   * @throws {Error} When the response status is not OK or the body is not valid JSON
   */
  private async parseResponse(res: Response, label: string): Promise<any> {
    const text = await res.text()

    if (!res.ok) {
      throw new Error(`Mailpit ${label} returned ${res.status}: ${text}`)
    }

    try {
      return JSON.parse(text)
    } catch {
      throw new Error(
        `Mailpit ${label} returned non-JSON (${res.status}): ${text}`,
      )
    }
  }
}
