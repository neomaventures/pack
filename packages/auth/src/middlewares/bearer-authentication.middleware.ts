import { ApplicationLogger } from "@neomaventures/logging"
import { Injectable, NestMiddleware } from "@nestjs/common"
import { Request, Response, NextFunction } from "express"

import { setAccount } from "../account/account.slot"
import { InvalidCredentialsException } from "../exceptions/invalid-credentials.exception"
import { AuthenticationService } from "../services/authentication.service"

/**
 * Middleware that attempts to authenticate the request using a Bearer token
 * in the Authorization header. If authentication is successful, the
 * authenticated account is assigned to req.account.
 *
 * If req.account is already set (by a previous middleware), this
 * middleware skips authentication and calls next.
 *
 * If no Authorization header is present, the request proceeds
 * unauthenticated without error.
 *
 * If an Authorization header is present but malformed (wrong scheme,
 * missing token), an InvalidCredentialsException is thrown.
 *
 * If the header is well-formed but authentication fails (invalid JWT,
 * expired token, user not found), no account is assigned and the
 * request proceeds unauthenticated with a warning logged.
 */
@Injectable()
export class BearerAuthenticationMiddleware implements NestMiddleware {
  public constructor(
    private readonly service: AuthenticationService,
    private readonly logger: ApplicationLogger,
  ) {}

  public async use(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    if (req.account) {
      return next()
    }

    const header = req.headers.authorization
    if (!header) {
      return next()
    }

    const [scheme, token] = header.split(/\s+/)

    if (scheme.toLowerCase() !== "bearer") {
      throw new InvalidCredentialsException(
        `Invalid authentication scheme. Expected Bearer but got "${scheme}"`,
      )
    }

    if (!token) {
      throw new InvalidCredentialsException(
        "Invalid authentication header format",
      )
    }

    try {
      req.account = await this.service.authenticate(token)
    } catch (err) {
      this.logger.warn("Authentication via authorization header failed", {
        err,
      })
    }

    if (req.account) {
      setAccount(req.account)
      res.locals.account = req.account
    }

    next()
  }
}
