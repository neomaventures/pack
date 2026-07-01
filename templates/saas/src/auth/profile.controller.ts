import {
  Account,
  Authenticated,
  AuthenticatedAccount,
} from "@neomaventures/auth"
import { ErrorTemplate } from "@neomaventures/exceptions"
import {
  MailboxApiException,
  MailboxNetworkException,
  MailboxService,
  type MailboxFolderStats,
} from "@neomaventures/mailbox"
import {
  StoredFile,
  TemporaryLink,
  Upload as UploadDecorator,
} from "@neomaventures/storage"
import {
  Controller,
  Get,
  NotFoundException,
  Post,
  Render,
  Res,
} from "@nestjs/common"
import { type Response } from "express"

import { AccountAvatarKeyResolver } from "~auth/account-avatar-key.resolver"
import { GmailNotConnectedException } from "~auth/gmail-not-connected.exception"
import { ProfileService } from "~auth/profile.service"
import { Upload } from "~auth/upload.entity"

/**
 * Row view-model for the "Connected accounts" table on `views/profile.ejs`.
 *
 * One row per persisted `OAuthToken`. When the provider is `google` and the
 * account is active with `gmail.readonly` scope, `stats` / `statsError` are
 * populated per the mailbox call outcome; otherwise both are `null`.
 */
interface ConnectedAccountRow {
  provider: string
  email: string
  scopes: string[]
  expiresAt: Date
  active: boolean
  stats: MailboxFolderStats | null
  statsError: "unavailable" | null
}

/**
 * Handles the profile page and profile-scoped asset endpoints.
 *
 * Renders `views/profile.ejs` for authenticated users, serves the
 * authenticated user's avatar via `GET /profile/avatar`, and accepts
 * avatar uploads via `POST /profile/avatar`.
 *
 * Page endpoints redirect unauthenticated visitors to `/auth/register`
 * (the module-wide default configured on `AuthModule.forRoot(...)`).
 * Asset endpoints (`/profile/avatar`) override that with a per-route
 * `onUnauthenticated: NotFoundException` so they return `404 Not Found` —
 * asset endpoints should not confirm the existence of a per-user resource
 * to an unauthenticated caller.
 *
 * Avatar bytes live on the consumer-owned `Profile` entity (one-to-one
 * with `Account`), not on `Account` itself — auth's `Account` is
 * deliberately minimal and customisation happens via FK composition.
 */
@Controller()
export class ProfileController {
  public constructor(
    private readonly profileService: ProfileService,
    private readonly mailbox: MailboxService,
  ) {}

  /**
   * Renders the profile page for the authenticated user.
   *
   * Avatar bytes are loaded by the page itself via `GET /profile/avatar`
   * rather than threaded through the view model. Connected third-party
   * accounts are passed inline as a sanitised view of
   * `account.oauthTokens` — `accessToken` and `refreshToken` are
   * deliberately omitted so they never reach the rendered HTML.
   *
   * Mailbox stats are fetched inline for the account's active Google token
   * when its scopes include `gmail.readonly`. Any of the three mailbox
   * exception classes are caught and surfaced on the row itself — the row
   * is always rendered so the user sees which providers are connected even
   * when Gmail is unreachable. `GmailNotConnectedException` leaves
   * `stats: null` (no CTA needed — the row still shows the provider);
   * `MailboxApiException` / `MailboxNetworkException` set
   * `statsError: "unavailable"` so the template renders "Unavailable" in
   * the counts cells.
   *
   * @param account - The authenticated account, injected via `@AuthenticatedAccount()`.
   * @returns A view model with the connected-accounts rows.
   */
  @Get("profile")
  @Authenticated()
  @ErrorTemplate({ default: "/error" })
  @Render("profile")
  public async index(
    @AuthenticatedAccount() account: Account,
  ): Promise<{ connectedAccounts: ConnectedAccountRow[] }> {
    const now = Date.now()
    const rows: ConnectedAccountRow[] = []
    for (const token of account.oauthTokens ?? []) {
      const active = new Date(token.expiresAt).getTime() > now
      const row: ConnectedAccountRow = {
        provider: token.provider,
        email: account.email,
        scopes: token.scopes,
        expiresAt: token.expiresAt,
        active,
        stats: null,
        statsError: null,
      }
      if (token.provider === "google") {
        try {
          row.stats = await this.mailbox.getStats()
        } catch (error) {
          if (error instanceof GmailNotConnectedException) {
            // Leave stats null; row still renders with the provider.
          } else if (
            error instanceof MailboxApiException ||
            error instanceof MailboxNetworkException
          ) {
            row.statsError = "unavailable"
          } else {
            throw error
          }
        }
      }
      rows.push(row)
    }
    return { connectedAccounts: rows }
  }

  /**
   * Serves the authenticated user's avatar.
   *
   * Delegates to {@link ProfileService.getAvatar}, which loads the
   * `Profile` row for the account and returns the eagerly-joined
   * `Upload`. When no profile or avatar is set, `null` causes the
   * framework to redirect to the static silhouette under
   * `/img/default-avatar.svg`.
   *
   * Unauthenticated callers get a 404 — asset endpoints don't confirm
   * resource existence.
   *
   * @param account - The authenticated account, injected via `@AuthenticatedAccount()`.
   * @returns The avatar `Upload`, or `null` when none is set.
   *
   * @example
   * ```html
   * <img src="/profile/avatar" alt="Your avatar">
   * ```
   */
  @Get("profile/avatar")
  @Authenticated({ onUnauthenticated: NotFoundException })
  @TemporaryLink({
    default: "/img/default-avatar.svg",
    cacheControl: "private, max-age=30",
  })
  public async avatar(
    @AuthenticatedAccount() account: Account,
  ): Promise<Upload | null> {
    return this.profileService.getAvatar(account)
  }

  /**
   * Accepts an avatar upload for the authenticated account.
   *
   * The `@Upload()` interceptor validates size/type, writes the file to S3
   * under the per-account key from {@link AccountAvatarKeyResolver}, and
   * stages the `Upload` entity. {@link ProfileService.setAvatar} then
   * persists the FK on the `Profile` row synchronously — not via
   * `FileCreatedEvent`. Events are fire-and-forget per the storage package
   * contract; doing the FK persistence in-band avoids silent
   * upload-without-FK on listener failure.
   *
   * Returns a 302 to `/profile` (POST-Redirect-GET) on success. Validation
   * failures bubble through the storage package's `HttpException` types
   * (`FileTooLargeException`, `UnsupportedFileTypeException`,
   * `NoFileProvidedException`). For HTML requests, `@ErrorTemplate` maps
   * those exceptions back to the `profile` view so the page re-renders
   * with an inline error message; API clients still get the JSON error
   * response with the original status code.
   *
   * Unauthenticated callers get a 404 — same asset-endpoint contract as
   * `GET /profile/avatar`.
   *
   * @param account - The authenticated account, injected via `@AuthenticatedAccount()`.
   * @param upload - The `Upload` entity created by the storage interceptor.
   * @param res - The Express response, used to send the 302 to `/profile`.
   */
  @Post("profile/avatar")
  @Authenticated({ onUnauthenticated: NotFoundException })
  @ErrorTemplate({
    FileTooLargeException: "profile",
    UnsupportedFileTypeException: "profile",
    NoFileProvidedException: "profile",
    default: "/error",
  })
  @UploadDecorator({
    types: ["image/jpeg", "image/png", "image/webp"],
    maxSize: 3_000_000,
    key: AccountAvatarKeyResolver,
  })
  public async uploadAvatar(
    @AuthenticatedAccount() account: Account,
    @StoredFile() upload: Upload,
    @Res() res: Response,
  ): Promise<void> {
    await this.profileService.setAvatar(account, upload)
    res.redirect("/profile")
  }
}
