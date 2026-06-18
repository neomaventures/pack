import { Controller, Get, Res } from "@nestjs/common"
import { type Response } from "express"

import {
  Account,
  GetGoogleAuthResult,
  GoogleAuthResult,
  GoogleCallback,
  SessionService,
} from "@neomaventures/auth"

interface GoogleCallbackResponse {
  token: string
  account: Account
  isNewAccount: boolean
}

/**
 * Demo controller for Google OAuth callback.
 * Used only for e2e testing — not part of the library.
 */
@Controller("auth/google")
export class GoogleAuthController {
  public constructor(private readonly sessionService: SessionService) {}

  /**
   * Handles the Google OAuth callback by exchanging the authorization code,
   * creating a session, and returning the account and token.
   *
   * @param result - The Google authentication result from the interceptor
   * @param res - The Express response for setting session cookies
   * @returns The session token, account, and isNewAccount flag
   */
  @Get("callback")
  @GoogleCallback()
  public async callback(
    @GetGoogleAuthResult() result: GoogleAuthResult,
    @Res({ passthrough: true }) res: Response,
  ): Promise<GoogleCallbackResponse> {
    const { token } = this.sessionService.create(res, result.account)
    return {
      token,
      account: result.account,
      isNewAccount: result.isNewAccount,
    }
  }
}
