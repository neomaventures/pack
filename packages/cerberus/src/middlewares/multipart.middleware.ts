import { Inject, Injectable, type NestMiddleware } from "@nestjs/common"
import { type NextFunction, type Request, type Response } from "express"
import multer, { type Multer, type MulterError } from "multer"

import { type CerberusOptions, CERBERUS_OPTIONS } from "../cerberus.options"
import { FileTooLargeException } from "../exceptions/file-too-large.exception"

/**
 * Middleware that parses multipart/form-data requests using multer
 * with in-memory storage.
 *
 * Registered globally by {@link CerberusModule} for all routes.
 * Non-multipart requests pass through untouched.
 *
 * When `maxFileSize` is configured in {@link CerberusOptions}, multer rejects
 * oversized files before buffering them into memory.
 */
@Injectable()
export class MultipartMiddleware implements NestMiddleware {
  private readonly upload: Multer

  public constructor(
    @Inject(CERBERUS_OPTIONS) private readonly options: CerberusOptions,
  ) {
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        files: 1,
        ...(options.maxFileSize !== undefined
          ? { fileSize: options.maxFileSize }
          : {}),
      },
    })
  }

  public use(req: Request, res: Response, next: NextFunction): void {
    this.upload.any()(req, res, (err: any) => {
      if (err) {
        if (
          (err as MulterError).code === "LIMIT_FILE_SIZE" &&
          this.options.maxFileSize !== undefined
        ) {
          next(new FileTooLargeException(null, this.options.maxFileSize))
          return
        }

        next(err)
        return
      }

      // Promote the first file from req.files to req.file for
      // consistency with multer.single() behaviour
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        req.file = req.files[0]
      }

      next()
    })
  }
}
