import { IsEmail, IsNotEmpty } from "class-validator"

/**
 * Data transfer object for the sign-up form submission.
 *
 * Validates that the email field is present and is a valid email address.
 */
export class SignupDto {
  /**
   * The email address submitted by the user.
   *
   * @example "alice@example.com"
   */
  @IsNotEmpty()
  @IsEmail()
  public email!: string
}
