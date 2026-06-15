import { Account } from "@neomaventures/auth"
import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"

import { Upload } from "~auth/upload.entity"
import { Profile } from "~profile/profile.entity"

/**
 * Application-layer service for the profile domain.
 *
 * Owns the write path for `Profile.avatar`. Reads happen directly against
 * the `Profile` repository in controllers — the eagerly-loaded `avatar`
 * relation means callers don't have to thread `relations: ['avatar']`
 * through every query.
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
