import { faker } from "@faker-js/faker"
import { Injectable } from "@nestjs/common"
import { Test } from "@nestjs/testing"

import { TestMailboxable } from "../fixtures/entities/test-mailboxable.entity"

import { GMAIL_API_BASE_URL, GMAIL_API_BASE_URL_DEFAULT } from "./constants"
import { MailAccount } from "./entities/mail-account.entity"
import { type TokenAccessor } from "./interfaces/token-accessor.interface"
import { MailboxModule } from "./mailbox.module"
import {
  type MailboxOptions,
  RESOLVED_MAILBOX_OPTIONS,
} from "./mailbox.options"

@Injectable()
class StubTokenAccessor implements TokenAccessor {
  public async getToken(): Promise<string> {
    return faker.string.alphanumeric(40)
  }
}

describe("MailboxModule", () => {
  describe("Given no entity or gmailApiBaseUrl overrides", () => {
    it("should default entity to MailAccount and gmailApiBaseUrl to the production endpoint", async () => {
      const options: MailboxOptions = { tokenAccessor: StubTokenAccessor }

      const module = await Test.createTestingModule({
        imports: [
          MailboxModule.forRootAsync({
            useFactory: () => options,
          }),
        ],
      }).compile()

      expect(module.get(RESOLVED_MAILBOX_OPTIONS)).toEqual({
        tokenAccessor: StubTokenAccessor,
        entity: MailAccount,
        gmailApiBaseUrl: GMAIL_API_BASE_URL_DEFAULT,
      })
    })

    it("should wire GMAIL_API_BASE_URL to the production default", async () => {
      const module = await Test.createTestingModule({
        imports: [
          MailboxModule.forRootAsync({
            useFactory: () => ({ tokenAccessor: StubTokenAccessor }),
          }),
        ],
      }).compile()

      expect(module.get(GMAIL_API_BASE_URL)).toBe(GMAIL_API_BASE_URL_DEFAULT)
    })
  })

  describe("Given a custom entity override", () => {
    it("should use the provided entity class", async () => {
      const module = await Test.createTestingModule({
        imports: [
          MailboxModule.forRootAsync({
            useFactory: (): MailboxOptions => ({
              tokenAccessor: StubTokenAccessor,
              entity: TestMailboxable,
            }),
          }),
        ],
      }).compile()

      expect(module.get(RESOLVED_MAILBOX_OPTIONS)).toMatchObject({
        entity: TestMailboxable,
      })
    })
  })

  describe("Given a custom gmailApiBaseUrl override", () => {
    it("should propagate the override to GMAIL_API_BASE_URL", async () => {
      const gmailApiBaseUrl = faker.internet.url()

      const module = await Test.createTestingModule({
        imports: [
          MailboxModule.forRootAsync({
            useFactory: (): MailboxOptions => ({
              tokenAccessor: StubTokenAccessor,
              gmailApiBaseUrl,
            }),
          }),
        ],
      }).compile()

      expect(module.get(GMAIL_API_BASE_URL)).toBe(gmailApiBaseUrl)
    })
  })
})
