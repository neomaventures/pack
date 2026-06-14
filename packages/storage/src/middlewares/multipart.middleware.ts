import { AsyncResource } from "node:async_hooks"

import { Inject, Injectable, type NestMiddleware } from "@nestjs/common"
import { type NextFunction, type Request, type Response } from "express"
import multer, { type Multer, type MulterError } from "multer"

import { FileTooLargeException } from "../exceptions/file-too-large.exception"
import { type StorageOptions, STORAGE_OPTIONS } from "../storage.options"

/**
 * Middleware that parses multipart/form-data requests using multer
 * with in-memory storage.
 *
 * Registered globally by {@link StorageModule} for all routes.
 * Non-multipart requests pass through untouched.
 *
 * When `maxFileSize` is configured in {@link StorageOptions}, multer rejects
 * oversized files before buffering them into memory.
 */
@Injectable()
export class MultipartMiddleware implements NestMiddleware {
  private readonly upload: Multer

  public constructor(
    @Inject(STORAGE_OPTIONS) private readonly options: StorageOptions,
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
    // Multer's callback is invoked from the `'finish'` listener on
    // `IncomingMessage`, which was constructed upstream by Node's HTTP
    // parser — so the listener runs in the HTTP-parser async context, not
    // in this middleware's. Any ALS frame opened by upstream middleware
    // (e.g. `@neomaventures/request-context`'s principal slot) is therefore
    // invisible to downstream guards/interceptors. `AsyncResource.bind`
    // snapshots our context onto the callback so the frame is restored.
    //
    // multer #814: https://github.com/expressjs/multer/issues/814
    // Regression spec: e2e/core/upload/als-propagation.e2e-spec.ts
    this.upload.any()(
      req,
      res,
      AsyncResource.bind((err: any) => {
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
      }),
    )
  }
}
