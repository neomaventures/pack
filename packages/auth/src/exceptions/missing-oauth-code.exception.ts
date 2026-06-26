import { BadRequestException } from "@nestjs/common"

/**
 * Thrown when an OAuth callback URL is hit without a `code` query
 * parameter — meaning the upstream redirect was malformed or the
 * consumer's controller is mis-wired. This is a client error
 * (HTTP 400), distinct from downstream API failures (which throw
 * {@link AuthApiException}).
 *
 * Subclass of {@link BadRequestException} so consumers can branch:
 * - `catch (e) { if (e instanceof BadRequestException) ... }` — HTTP semantics
 * - `catch (e) { if (e instanceof MissingOAuthCodeException) ... }` — specific filtering
 *
 * @example
 * ```typescript
 * if (!code) {
 *   throw new MissingOAuthCodeException()
 * }
 * ```
 */
export class MissingOAuthCodeException extends BadRequestException {
  /**
   * @param message - Optional override for the human-readable message.
   */
  public constructor(
    message: string = "Missing code query parameter on OAuth callback",
  ) {
    super(message)
  }
}
