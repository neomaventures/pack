import { ApplicationLoggerService } from "@neomaventures/logging"
import { Inject, Injectable, NestMiddleware } from "@nestjs/common"
import * as cookie from "cookie"
import { Request, NextFunction } from "express"

import { setAccount } from "../account/account.slot"
import { AuthOptions, AUTH_OPTIONS } from "../auth.options"
import { AuthenticationService } from "../services/authentication.service"

/**
 * Middleware that attempts to authenticate the request using the
 * auth.sid cookie (or a custom cookie name from options).
 *
 * If req.account is already set (by a previous middleware), this
 * middleware skips authentication and calls next.
 *
 * If no cookie header is present or there is no matching cookie,
 * the request proceeds unauthenticated without error.
 *
 * If the cookie is present but authentication fails, no account
 * is assigned and the request proceeds unauthenticated with a
 * warning logged.
 */
@Injectable()
export class CookieAuthenticationMiddleware implements NestMiddleware {
  private readonly cookieName: string

  public constructor(
    private readonly service: AuthenticationService,
    private readonly logger: ApplicationLoggerService,
    @Inject(AUTH_OPTIONS) options: AuthOptions,
  ) {
    this.cookieName = options.cookie?.name ?? "auth.sid"
  }

  public async use(
    req: Request,
    _res: Express.Response,
    next: NextFunction,
  ): Promise<void> {
    if (req.account) {
      return next()
    }

    const cookieHeader = req.headers.cookie
    if (!cookieHeader) {
      return next()
    }

    const cookies = cookie.parse(cookieHeader)
    const sid = cookies[this.cookieName]
    if (!sid) {
      return next()
    }

    try {
      req.account = await this.service.authenticate(sid)
    } catch (err) {
      this.logger.warn("Authentication via cookie failed", { err })
    }

    if (req.account) {
      setAccount(req.account)
    }

    next()
  }
}
