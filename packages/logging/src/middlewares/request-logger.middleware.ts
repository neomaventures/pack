import { Injectable, type NestMiddleware } from "@nestjs/common"
import { type NextFunction, type Request, type Response } from "express"

import { RequestLoggerService } from "../services"

// `Request.logger` is augmented in src/types/express.ts (shipped via index.ts).

/**
 * Piece of middleware that adds a {@link RequestLoggerService} instance to the incoming {@link Request}
 *
 * Note: It is sensible to install this piece of middleware as the first thing on Application start, that way
 * the {@link RequestLoggerService} is installed onto the {@link Request} as early as possible.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware<
  Request,
  Response
> {
  /**
   * Constructs a RequestLoggerMiddleware instance with the {@link RequestLoggerService} that will be
   * attached to incoming {@link Request}s
   *
   * @param {RequestLoggerService} logger - The {@link RequestLoggerService} to install on the {@link Request} object.
   */
  public constructor(public readonly logger: RequestLoggerService) {}

  /**
   * Installs the {@link RequestLoggerService} onto the {@link Request} at req.logger.
   *
   * @param req - The received {@link Request}.
   * @param _res - The current {@link Response}.
   * @param next - Called once the {@link RequestLoggerService} is installed onto the {@link Request}.
   */
  public use(req: Request, _res: Response, next: NextFunction): void {
    req.logger = this.logger
    next()
  }
}
