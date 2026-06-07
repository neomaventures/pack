import { Injectable, type NestMiddleware } from "@nestjs/common"
import { type NextFunction, type Request, type Response } from "express"

/**
 * Sets shared view locals available to all EJS templates.
 *
 * Injects the following variables into `res.locals` on every request:
 * - `appName` — the application display name
 * - `version` — the application version from `package.json`
 */
@Injectable()
export class ViewLocalsMiddleware implements NestMiddleware {
  /**
   * Attaches shared template variables to the response locals.
   *
   * @param _req - The incoming request (unused).
   * @param res - The outgoing response whose locals are populated.
   * @param next - Callback to pass control to the next middleware.
   */
  public use(_req: Request, res: Response, next: NextFunction): void {
    res.locals.appName = "__APP_NAME__"
    res.locals.version = process.env.npm_package_version ?? "0.0.0"
    next()
  }
}
