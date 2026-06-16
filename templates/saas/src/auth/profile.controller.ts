import { Account, Authenticated, CurrentAccount } from "@neomaventures/auth"
import { ErrorTemplate } from "@neomaventures/exceptions"
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
import { Upload } from "~auth/upload.entity"
import { ProfileService } from "~profile/profile.service"

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
  public constructor(private readonly profileService: ProfileService) {}

  /**
   * Renders the profile page for the authenticated user.
   *
   * Avatar bytes are loaded by the page itself via `GET /profile/avatar`
   * rather than threaded through the view model. Connected third-party
   * accounts are passed inline as a sanitised view of
   * `account.oauthTokens` — `accessToken` and `refreshToken` are
   * deliberately omitted so they never reach the rendered HTML.
   *
   * @param account - The authenticated account, injected via `@CurrentAccount()`.
   * @returns A view model with the connected-accounts list.
   */
  @Get("profile")
  @Authenticated()
  @Render("profile")
  public index(@CurrentAccount() account: Account): {
    connectedAccounts: Array<{
      provider: string
      scopes: string[]
      expiresAt: Date
      active: boolean
    }>
  } {
    const now = Date.now()
    const connectedAccounts = (account.oauthTokens ?? []).map((token) => ({
      provider: token.provider,
      scopes: token.scopes,
      expiresAt: token.expiresAt,
      active: new Date(token.expiresAt).getTime() > now,
    }))
    return { connectedAccounts }
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
   * @param account - The authenticated account, injected via `@CurrentAccount()`.
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
    @CurrentAccount() account: Account,
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
   * @param account - The authenticated account, injected via `@CurrentAccount()`.
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
    @CurrentAccount() account: Account,
    @StoredFile() upload: Upload,
    @Res() res: Response,
  ): Promise<void> {
    await this.profileService.setAvatar(account, upload)
    res.redirect("/profile")
  }
}
