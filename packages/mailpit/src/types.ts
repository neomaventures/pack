/**
 * A recipient address in a Mailpit message.
 */
export interface MailpitAddress {
  Name: string
  Address: string
}

/**
 * A message summary as returned by the Mailpit `/messages` endpoint.
 */
export interface MailpitMessageSummary {
  ID: string
  From: MailpitAddress
  To: MailpitAddress[]
  Subject: string
  Size: number
  Created: string
}

/**
 * The response from the Mailpit `/messages` endpoint.
 */
export interface MailpitMessageList {
  total: number
  messages: MailpitMessageSummary[]
}

/**
 * A full message as returned by the Mailpit `/message/:id` endpoint.
 */
export interface MailpitMessage {
  ID: string
  From: MailpitAddress
  To: MailpitAddress[]
  Subject: string
  HTML: string
  Text: string
  Size: number
  Created: string
}
