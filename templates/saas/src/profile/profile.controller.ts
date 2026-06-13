import {
  type Authenticatable,
  Authenticated,
  Principal,
} from "@neomaventures/auth"
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
  UseGuards,
} from "@nestjs/common"
import { type Response } from "express"

import { AccountAvatarKeyResolver } from "~profile/account-avatar-key.resolver"
import { ProfileService } from "~profile/profile.service"
import { Upload } from "~profile/upload.entity"

/**
 * Handles the profile page and profile-scoped asset endpoints.
 *
 * Renders `views/profile.ejs` for authenticated users, serves the
 * authenticated user's avatar via `GET /profile/avatar`, and accepts
 * avatar uploads via `POST /profile/avatar`.
 *
 * Page endpoints redirect unauthenticated visitors to `/auth/register`.
 * Asset endpoints (`/profile/avatar`) return `401 Unauthorized` instead —
 * an `<img>` tag should not follow a 302 to a login page, and the upload
 * endpoint shares the same asset contract.
 */
@Controller()
export class ProfileController {
  /**
   * @param profileService - Resolves profile-scoped data for the
   *   authenticated account (e.g. the avatar).
   */
  public constructor(private readonly profileService: ProfileService) {}

  /**
   * Renders the profile page for the authenticated user.
   *
   * @returns An empty view model; the template currently has no
   *   dynamic data. Avatar rendering will be added in slice 1.
   */
  @Get("profile")
  @UseGuards(new Authenticated("/auth/register"))
  @Render("profile")
  public index(): Record<string, never> {
    return {}
  }

  /**
   * Serves the authenticated user's avatar.
   *
   * Resolves the avatar `Upload` for the current principal and lets
   * `@TemporaryLink` issue a 302 to a presigned S3 URL. When no avatar
   * is set, the handler returns `null` and the `default` option
   * redirects to the static silhouette under `/img/default-avatar.svg`.
   *
   * Authentication is enforced with the bare `Authenticated` guard
   * (no redirect URL) so unauthenticated requests get `401` rather than
   * a 302 to the login page — appropriate for an `<img>` source.
   *
   * @param principal - The authenticated account, injected via
   *   `@Principal()`.
   * @returns The user's avatar `Upload`, or `null` when none is set
   *   (the framework then redirects to the default).
   *
   * @example
   * ```html
   * <img src="/profile/avatar" alt="Your avatar">
   * ```
   */
  @Get("profile/avatar")
  @UseGuards(Authenticated)
  @TemporaryLink({
    default: "/img/default-avatar.svg",
    cacheControl: "private, max-age=30",
  })
  public avatar(
    @Principal() principal: Authenticatable,
  ): Promise<Upload | null> {
    return this.profileService.getAvatar(principal.id as string)
  }

  /**
   * Accepts an avatar upload for the authenticated account.
   *
   * The `@Upload()` interceptor validates size/type, writes the file to S3
   * under the per-account key from {@link AccountAvatarKeyResolver}, and
   * persists the `Upload` entity. This handler then sets the FK on
   * `Account.avatar` synchronously — not via `FileCreatedEvent`. Events
   * are fire-and-forget per the storage package contract; doing the FK
   * persistence in-band avoids silent orphan-upload-without-FK on listener
   * failure.
   *
   * Returns a 302 to `/profile` (POST-Redirect-GET) on success. Validation
   * failures bubble through the storage package's `HttpException` types
   * (`FileTooLargeException`, `UnsupportedFileTypeException`,
   * `NoFileProvidedException`). For HTML requests, `@ErrorTemplate` maps
   * those exceptions back to the `profile` view so the page re-renders
   * with an inline error message; API clients still get the JSON error
   * response with the original status code.
   *
   * Authentication uses the bare `Authenticated` guard — this is an asset
   * endpoint, not a page, so it returns 401 rather than redirecting.
   *
   * @param principal - The authenticated account, injected via `@Principal()`.
   * @param upload - The `Upload` entity created by the storage interceptor.
   * @param res - The Express response, used to send the 302 to `/profile`.
   *
   * @example
   * ```html
   * <form action="/profile/avatar" method="post" enctype="multipart/form-data">
   *   <input type="file" name="file" accept="image/jpeg,image/png,image/webp">
   *   <button type="submit">Upload</button>
   * </form>
   * ```
   */
  @Post("profile/avatar")
  @UseGuards(Authenticated)
  @ErrorTemplate({
    FileTooLargeException: "profile",
    UnsupportedFileTypeException: "profile",
    NoFileProvidedException: "profile",
    default: "/error",
  })
  @UploadDecorator({
    types: ["image/jpeg", "image/png", "image/webp"],
    maxSize: 1_000_000,
    key: AccountAvatarKeyResolver,
  })
  public async uploadAvatar(
    @Principal() principal: Authenticatable,
    @StoredFile() upload: Upload,
    @Res() res: Response,
  ): Promise<void> {
    const account = await this.profileService.findAccount(
      principal.id as string,
    )

    if (!account) {
      throw new NotFoundException()
    }

    await this.profileService.setAvatar(account, upload)
    res.redirect("/profile")
  }
}
