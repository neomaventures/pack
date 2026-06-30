import { faker } from "@faker-js/faker"
import { Test } from "@nestjs/testing"

import { StubTokenAccessor } from "../fixtures/token-accessors/stub.token-accessor"

import { MailboxModule } from "./mailbox.module"
import { RESOLVED_MAILBOX_OPTIONS } from "./mailbox.options"
import {
  GMAIL_API_BASE_URL,
  GMAIL_API_BASE_URL_DEFAULT,
} from "./providers/gmail/constants"

describe("MailboxModule", () => {
  describe("forRootAsync", () => {
    describe("Given no gmailApiBaseUrl override", () => {
      it("should default gmailApiBaseUrl to the production endpoint", async () => {
        const module = await Test.createTestingModule({
          imports: [
            MailboxModule.forRootAsync({
              tokenAccessor: StubTokenAccessor,
              useFactory: () => ({}),
            }),
          ],
        }).compile()

        expect(module.get(RESOLVED_MAILBOX_OPTIONS)).toEqual({
          gmailApiBaseUrl: GMAIL_API_BASE_URL_DEFAULT,
        })
      })

      it("should wire GMAIL_API_BASE_URL to the production default", async () => {
        const module = await Test.createTestingModule({
          imports: [
            MailboxModule.forRootAsync({
              tokenAccessor: StubTokenAccessor,
              useFactory: () => ({}),
            }),
          ],
        }).compile()

        expect(module.get(GMAIL_API_BASE_URL)).toBe(GMAIL_API_BASE_URL_DEFAULT)
      })
    })

    describe("Given a custom gmailApiBaseUrl override", () => {
      it("should propagate the override to GMAIL_API_BASE_URL", async () => {
        const gmailApiBaseUrl = faker.internet.url()

        const module = await Test.createTestingModule({
          imports: [
            MailboxModule.forRootAsync({
              tokenAccessor: StubTokenAccessor,
              useFactory: () => ({ gmailApiBaseUrl }),
            }),
          ],
        }).compile()

        expect(module.get(GMAIL_API_BASE_URL)).toBe(gmailApiBaseUrl)
      })
    })
  })
})
