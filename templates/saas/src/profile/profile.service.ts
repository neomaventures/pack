import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"

import { Account } from "~auth/account.entity"
import { Upload } from "~profile/upload.entity"

/**
 * Application-layer service for the profile feature.
 *
 * Persists profile-scoped state for the authenticated account. The avatar
 * is eagerly loaded on `Account`, so reads of the avatar happen directly
 * off the principal in the controller — this service is only involved on
 * the write path.
 */
@Injectable()
export class ProfileService {
  /**
   * @param accounts - Repository for {@link Account}. Used to write the
   *   avatar FK after the storage pipeline has persisted the file.
   * @param uploads - Repository for {@link Upload}. The storage pipeline
   *   only saves the upload row in its post-handler step; we save it
   *   in-band so the FK has a stable id to point at.
   */
  public constructor(
    @InjectRepository(Account)
    private readonly accounts: Repository<Account>,
    @InjectRepository(Upload)
    private readonly uploads: Repository<Upload>,
  ) {}

  /**
   * Sets the given {@link Upload} as the account's avatar, persisting the
   * FK on the `Account` row.
   *
   * Called synchronously from the upload controller after the storage
   * package has written the file to S3. Doing the FK assignment in-band
   * (rather than from a `FileCreatedEvent` listener) keeps the slice of
   * work atomic from the caller's perspective — a successful 302 to
   * `/profile` is the signal that the avatar is live.
   *
   * Implementation note: `repository.update()` generates a direct SQL
   * `UPDATE` without consulting the change-tracker. Calling `save()` on
   * an account previously loaded with the eager avatar relation hydrated
   * as `null` triggers an `UpdateValuesMissingError` from TypeORM's
   * `UpdateQueryBuilder`; `update()` sidesteps that path entirely.
   *
   * @param account - The authenticated account to update.
   * @param upload - The `Upload` entity returned by the storage pipeline.
   *   Persisted here so the FK has a stable id to point at.
   *
   * @example
   * ```typescript
   * await profileService.setAvatar(account, file)
   * res.redirect("/profile")
   * ```
   */
  public async setAvatar(account: Account, upload: Upload): Promise<void> {
    const saved = await this.uploads.save(upload)
    await this.accounts.update(account.id, { avatar: saved })
  }
}
