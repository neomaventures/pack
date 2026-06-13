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
}
