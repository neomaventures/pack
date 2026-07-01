import { faker } from "@faker-js/faker"
import {
  type Account,
  type OAuthToken as AuthOAuthToken,
} from "@neomaventures/auth"
import { express } from "@neomaventures/fixtures"
import { google } from "@neomaventures/google-fixtures"
import {
  GMAIL_READONLY_SCOPE,
  MailboxApiException,
  MailboxNetworkException,
  type MailboxService,
  type MailboxFolderStats,
} from "@neomaventures/mailbox"
import { HttpException } from "@nestjs/common"

import { GmailNotConnectedException } from "~auth/gmail-not-connected.exception"
import { ProfileController } from "~auth/profile.controller"
import { type ProfileService } from "~auth/profile.service"
import { type Upload } from "~auth/upload.entity"

const buildGoogleToken = (
  overrides: Partial<AuthOAuthToken> = {},
): AuthOAuthToken =>
  ({
    provider: "google",
    accessToken: google.accessToken(),
    refreshToken: google.refreshToken(),
    expiresAt: new Date(Date.now() + 3600 * 1000),
    scopes: google.sensibleScopes([GMAIL_READONLY_SCOPE]),
    ...overrides,
  }) as AuthOAuthToken

const buildAccount = (overrides: Partial<Account> = {}): Account =>
  ({
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    oauthTokens: [],
    ...overrides,
  }) as Account

describe("ProfileController", () => {
  let controller: ProfileController
  let profileService: jest.Mocked<
    Pick<ProfileService, "setAvatar" | "getAvatar">
  >
  let mailbox: jest.Mocked<Pick<MailboxService, "getStats">>

  beforeEach(() => {
    profileService = { setAvatar: jest.fn(), getAvatar: jest.fn() }
    mailbox = { getStats: jest.fn() }
    controller = new ProfileController(
      profileService as unknown as ProfileService,
      mailbox as unknown as MailboxService,
    )
  })

  describe("index()", () => {
    const stats: MailboxFolderStats = {
      folder: "INBOX",
      messageCount: faker.number.int({ min: 100, max: 5000 }),
      unreadCount: faker.number.int({ min: 0, max: 99 }),
    }

    describe("Given an authenticated account with no oauthTokens", () => {
      it("should return an empty connectedAccounts list", async () => {
        const account = buildAccount()

        await expect(controller.index(account)).resolves.toEqual({
          connectedAccounts: [],
        })
        expect(mailbox.getStats).not.toHaveBeenCalled()
      })
    })

    describe("Given an authenticated account with an active Google token and Gmail returns stats", () => {
      it("should return a connectedAccounts row with active: true, stats, and no access/refresh tokens", async () => {
        const token = buildGoogleToken()
        const account = buildAccount({ oauthTokens: [token] })
        mailbox.getStats.mockResolvedValue(stats)

        const result = await controller.index(account)

        expect(result.connectedAccounts).toEqual([
          {
            provider: "google",
            email: account.email,
            scopes: token.scopes,
            expiresAt: token.expiresAt,
            active: true,
            stats,
            statsError: null,
          },
        ])
        expect(result.connectedAccounts[0]).not.toHaveProperty("accessToken")
        expect(result.connectedAccounts[0]).not.toHaveProperty("refreshToken")
      })
    })

    describe("Given the Google token is expired", () => {
      it("should return a connectedAccounts row with active: false and null stats", async () => {
        const token = buildGoogleToken({
          expiresAt: new Date(Date.now() - 60 * 1000),
        })
        const account = buildAccount({ oauthTokens: [token] })
        mailbox.getStats.mockRejectedValue(new GmailNotConnectedException())

        const result = await controller.index(account)

        expect(result.connectedAccounts).toHaveLength(1)
        expect(result.connectedAccounts[0]!.active).toBe(false)
        expect(result.connectedAccounts[0]!.stats).toBeNull()
        expect(result.connectedAccounts[0]!.statsError).toBeNull()
      })
    })

    describe("Given mailbox throws GmailNotConnectedException", () => {
      it("should return a row with stats: null and statsError: null (row still visible)", async () => {
        const token = buildGoogleToken({ scopes: google.sensibleScopes() })
        const account = buildAccount({ oauthTokens: [token] })
        mailbox.getStats.mockRejectedValue(new GmailNotConnectedException())

        const result = await controller.index(account)

        expect(result.connectedAccounts[0]!.stats).toBeNull()
        expect(result.connectedAccounts[0]!.statsError).toBeNull()
      })
    })

    describe("Given mailbox throws MailboxApiException", () => {
      it("should return a row with statsError: 'unavailable'", async () => {
        const token = buildGoogleToken()
        const account = buildAccount({ oauthTokens: [token] })
        mailbox.getStats.mockRejectedValue(
          new MailboxApiException(
            "/gmail/v1/users/me/labels/{labelId}",
            { labelId: "INBOX" },
            new HttpException("upstream", 500),
          ),
        )

        const result = await controller.index(account)

        expect(result.connectedAccounts[0]!.stats).toBeNull()
        expect(result.connectedAccounts[0]!.statsError).toBe("unavailable")
      })
    })

    describe("Given mailbox throws MailboxNetworkException", () => {
      it("should return a row with statsError: 'unavailable'", async () => {
        const token = buildGoogleToken()
        const account = buildAccount({ oauthTokens: [token] })
        mailbox.getStats.mockRejectedValue(
          new MailboxNetworkException(
            "/gmail/v1/users/me/labels/{labelId}",
            { labelId: "INBOX" },
            new Error("connection reset"),
          ),
        )

        const result = await controller.index(account)

        expect(result.connectedAccounts[0]!.statsError).toBe("unavailable")
      })
    })

    describe("Given mailbox throws an unrelated error", () => {
      it("should propagate the error", async () => {
        const token = buildGoogleToken()
        const account = buildAccount({ oauthTokens: [token] })
        const boom = new Error("boom")
        mailbox.getStats.mockRejectedValue(boom)

        await expect(controller.index(account)).rejects.toBe(boom)
      })
    })

    describe("Given the token is for a non-google provider", () => {
      it("should return the row without calling mailbox and with null stats", async () => {
        const token = buildGoogleToken({ provider: "github" })
        const account = buildAccount({ oauthTokens: [token] })

        const result = await controller.index(account)

        expect(mailbox.getStats).not.toHaveBeenCalled()
        expect(result.connectedAccounts[0]!.stats).toBeNull()
        expect(result.connectedAccounts[0]!.statsError).toBeNull()
      })
    })
  })

  describe("avatar()", () => {
    describe("Given profileService.getAvatar returns an Upload", () => {
      it("should return that Upload", async () => {
        const upload = { id: faker.string.uuid() } as Upload
        const account = buildAccount()
        profileService.getAvatar.mockResolvedValue(upload)

        await expect(controller.avatar(account)).resolves.toBe(upload)
        expect(profileService.getAvatar).toHaveBeenCalledWith(account)
      })
    })

    describe("Given profileService.getAvatar returns null", () => {
      it("should return null", async () => {
        const account = buildAccount()
        profileService.getAvatar.mockResolvedValue(null)

        await expect(controller.avatar(account)).resolves.toBeNull()
      })
    })
  })

  describe("uploadAvatar()", () => {
    describe("Given an authenticated account and a stored Upload", () => {
      it("should call profileService.setAvatar and redirect to /profile", async () => {
        const account = buildAccount()
        const upload = { id: faker.string.uuid() } as Upload
        const res = express.response() as unknown as Parameters<
          ProfileController["uploadAvatar"]
        >[2]

        await controller.uploadAvatar(account, upload, res)

        expect(profileService.setAvatar).toHaveBeenCalledWith(account, upload)
        expect(res.redirect).toHaveBeenCalledWith("/profile")
      })
    })
  })
})
