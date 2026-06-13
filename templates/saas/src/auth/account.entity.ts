import {
  type Authenticatable,
  type AuthenticatableProfile,
} from "@neomaventures/auth"
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm"

import { Upload } from "~profile/upload.entity"

/**
 * Represents an authenticated account in the application.
 *
 * Implements {@link Authenticatable} so that `@neomaventures/auth` can
 * resolve, create, and authorise accounts via magic-link or OAuth flows.
 *
 * @example
 * ```typescript
 * const account = repository.create({ email: "alice@example.com" })
 * await repository.save(account)
 * ```
 */
@Entity()
export class Account implements Authenticatable {
  /** UUID primary key, auto-generated on insert. */
  @PrimaryGeneratedColumn("uuid")
  public id!: string

  /** Unique email address used for authentication. */
  @Column({ unique: true })
  public email!: string

  /**
   * Permission strings for authorisation.
   * Defaults to an empty array when not provided.
   *
   * @example `["read:articles", "write:articles"]`
   */
  @Column("simple-array", { default: "" })
  public permissions!: string[]

  /** Optional provider-specific profile data (e.g. Google OAuth claims). */
  @Column("simple-json", { nullable: true })
  public authProfile?: AuthenticatableProfile

  /**
   * The account holder's avatar image, or `null` when no avatar has been
   * set. Eagerly loaded on every Account query — the JOIN is cheap (single
   * UUID FK) and templates can access `account.avatar` directly without
   * threading `relations: ['avatar']` through every callsite.
   *
   * Switch to explicit `relations: ['avatar']` per-query if the eager JOIN
   * ever shows up in a profile.
   *
   * At the database layer this `@OneToOne` generates a `UQ` constraint on
   * `avatarUploadId` and an `FK` to the `upload` table — that is why the
   * migration that introduced the column carries two named constraints
   * alongside the column itself. TypeORM produces these names; do not be
   * surprised by their verbosity.
   */
  @OneToOne(() => Upload, { eager: true, nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "avatarUploadId" })
  public avatar?: Upload | null
}
