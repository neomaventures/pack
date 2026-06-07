import { type Authenticatable, type AuthenticatableProfile } from "@neomaventures/auth"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

/**
 * Represents an authenticated user in the application.
 *
 * Implements {@link Authenticatable} so that `@neomaventures/auth` can
 * resolve, create, and authorise users via magic-link or OAuth flows.
 *
 * @example
 * ```typescript
 * const user = repository.create({ email: "alice@example.com" })
 * await repository.save(user)
 * ```
 */
@Entity()
export class User implements Authenticatable {
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
}
