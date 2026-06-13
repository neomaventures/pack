import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"

import { Account } from "~auth/account.entity"
import { Upload } from "~profile/upload.entity"

/**
 * Application-layer service for the profile feature.
 *
 * Resolves profile-scoped data for the authenticated account, including
 * the user's avatar. The avatar is loaded via the eager `Account.avatar`
 * relation set up in slice 0 — no explicit `relations: ['avatar']` is
 * needed here.
 */
@Injectable()
export class ProfileService {
  /**
   * @param accounts - Repository for {@link Account}. Injected by
   *   `@InjectRepository` so the in-memory test datasource and the
   *   production datasource can each provide their own instance.
   */
  public constructor(
    @InjectRepository(Account)
    private readonly accounts: Repository<Account>,
    @InjectRepository(Upload)
    private readonly uploads: Repository<Upload>,
  ) {}

  /**
   * Returns the {@link Upload} currently set as the account's avatar,
   * or `null` when no avatar has been uploaded.
   *
   * Pairs with `@TemporaryLink({ default: "/img/default-avatar.svg" })`
   * on the controller — a `null` return causes the framework to redirect
   * to the default silhouette rather than throw.
   *
   * @param accountId - UUID of the account whose avatar to resolve.
   * @returns The avatar `Upload`, or `null` when none is set or the
   *   account does not exist.
   *
   * @example
   * ```typescript
   * const avatar = await profileService.getAvatar(principal.id)
   * // avatar === null when the user has not uploaded one yet
   * ```
   */
  public async getAvatar(accountId: string): Promise<Upload | null> {
    const account = await this.accounts.findOneBy({ id: accountId })

    return account?.avatar ?? null
  }

  /**
   * Sets the given {@link Upload} as the account's avatar, persisting the
   * FK on the `Account` row.
   *
   * Called synchronously from the upload controller after the storage
   * package has written the file to S3 and persisted the `Upload` entity.
   * Doing the FK assignment in-band (rather than from a `FileCreatedEvent`
   * listener) keeps the slice of work atomic from the caller's perspective —
   * a successful 302 to `/profile` is the signal that the avatar is live.
   *
   * @param account - The authenticated account to update.
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
    // The `@StoredFile()` entity has not yet been persisted when the
    // handler runs — the storage interceptor only saves it in the
    // post-handler step (which fires after the controller's redirect).
    // Save it ourselves so we have a stable id to point the FK at; the
    // interceptor's later save becomes an idempotent update.
    //
    // The relation builder writes only the join column. `repository.save()`
    // after `account.avatar = upload` works for a freshly-created account,
    // but on an entity already loaded via `findOneBy` (where the avatar
    // relation was eagerly hydrated as `null`) TypeORM's change-tracker
    // produces an `UpdateQueryBuilder` with no scalar SET clause and throws
    // `UpdateValuesMissingError`. The relation builder sidesteps the tracker.
    const saved = await this.uploads.save(upload)
    await this.accounts
      .createQueryBuilder()
      .relation(Account, "avatar")
      .of(account.id)
      .set(saved.id)
  }

  /**
   * Loads an {@link Account} by id. Returns `null` when no row exists.
   *
   * Thin pass-through so the controller doesn't need to inject the
   * `Account` repository directly — keeps the controller free of
   * persistence concerns.
   *
   * @param accountId - UUID of the account to load.
   * @returns The account row, or `null` when not found.
   */
  public findAccount(accountId: string): Promise<Account | null> {
    return this.accounts.findOneBy({ id: accountId })
  }
}
