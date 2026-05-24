// Mailpit client
export { MailpitClient } from "./client"

// Mailpit message types
export type {
  MailpitAddress,
  MailpitMessage,
  MailpitMessageList,
  MailpitMessageSummary,
} from "./types"

// Container lifecycle
export { startContainer, stopContainer } from "./docker/container"
export type { MailpitConfig, MailpitOptions } from "./docker/container"
