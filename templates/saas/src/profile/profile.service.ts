import { Account } from "@neomaventures/auth"
import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"

import { Upload } from "~auth/upload.entity"
import { Profile } from "~profile/profile.entity"

/**
 * Application-layer service for the profile domain.
 *
 * Owns the read and write paths for `Profile.avatar`. The eagerly-loaded
 * `avatar` relation means callers don't have to thread
 * `relations: ['avatar']` through every query.
 */
@Injectable()
export class ProfileService {
  /**
   * @param profiles - Repository for {@link Profile}.
   */
  public constructor(
    @InjectRepository(Profile)
    private readonly profiles: Repository<Profile>,
  ) {}

  /**
   * Sets the given {@link Upload} as the account's avatar.
   *
   * Loads (or creates) the `Profile` row for the account and persists the
   * avatar FK. Called synchronously from the upload controller after the
   * storage package has written the file to S3 and persisted the `Upload`
   * row.
   *
   * @param account - The authenticated account whose avatar is being set.
   * @param upload - The persisted `Upload` entity returned by the storage
   *   pipeline.
   *
   * @example
   * ```typescript
   * await profileService.setAvatar(account, file)
   * res.redirect("/profile")
   * ```
   */
  /**
   * Returns the account's avatar, or null when none is set.
   *
   * Loads the Profile row for the account and returns the eagerly-joined
   * Upload. The eager relation means the avatar comes back in the same
   * query.
   *
   * @param account - The authenticated account whose avatar is being read.
   * @returns The avatar `Upload`, or `null` when the account has no profile
   *   row or has not set an avatar.
   *
   * @example
   * ```typescript
   * const avatar = await profileService.getAvatar(account)
   * ```
   */
  public async getAvatar(account: Account): Promise<Upload | null> {
    const profile = await this.profiles.findOne({
      where: { account: { id: account.id } },
    })
    return profile?.avatar ?? null
  }

  public async setAvatar(account: Account, upload: Upload): Promise<void> {
    const existing = await this.profiles.findOne({
      where: { account: { id: account.id } },
    })

    if (existing) {
      existing.avatar = upload
      await this.profiles.save(existing)
      return
    }

    await this.profiles.save(this.profiles.create({ account, avatar: upload }))
  }
}
