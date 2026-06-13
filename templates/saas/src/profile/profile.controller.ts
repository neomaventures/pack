import {
  type Authenticatable,
  Authenticated,
  Principal,
} from "@neomaventures/auth"
import { TemporaryLink } from "@neomaventures/storage"
import { Controller, Get, Render, UseGuards } from "@nestjs/common"

import { ProfileService } from "~profile/profile.service"
import { Upload } from "~profile/upload.entity"

/**
 * Handles the profile page and profile-scoped asset endpoints.
 *
 * Renders `views/profile.ejs` for authenticated users and serves the
 * authenticated user's avatar via `/profile/avatar`.
 *
 * Page endpoints redirect unauthenticated visitors to `/auth/register`.
 * Asset endpoints (`/profile/avatar`) return `401 Unauthorized` instead —
 * an `<img>` tag should not follow a 302 to a login page.
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
}
