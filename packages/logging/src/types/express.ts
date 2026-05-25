import { type LoggerService } from "@nestjs/common"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express global augmentation requires namespace
  namespace Express {
    interface Request {
      /** The request-scoped logger installed by `RequestLoggerMiddleware`. */
      logger?: LoggerService
    }
  }
}

export {}
