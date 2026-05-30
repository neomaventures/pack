import { createParamDecorator, type ExecutionContext } from "@nestjs/common"

import { type Storable } from "../interfaces/storable.interface"

/**
 * Parameter decorator that extracts the stored file entity from the request.
 *
 * The entity is attached to `req.cerberus.storedFile` by the {@link UploadInterceptor}
 * during the pre-handler phase. The handler may mutate the entity to set
 * additional fields before the interceptor persists it in the post-handler phase.
 *
 * @example
 * ```typescript
 * @Post()
 * @Upload()
 * public async create(@StoredFile() file: Upload): Promise<Upload> {
 *   file.source = "form"
 *   return file
 * }
 * ```
 */
export const StoredFile = createParamDecorator(
  /**
   * Returns the stored file entity at `req.cerberus.storedFile`.
   *
   * @param _data - Ignored.
   * @param context - Execution context providing access to the underlying request.
   * @returns The stored file entity from the request.
   * @throws {Error} If `req.cerberus.storedFile` does not exist.
   */
  (_data: any, context: ExecutionContext): Storable => {
    const req = context.switchToHttp().getRequest()
    if (!req.cerberus?.storedFile) {
      throw new Error(
        "@StoredFile() called without a stored file on the request. Have you applied the @Upload() decorator to this handler?",
      )
    }
    return req.cerberus.storedFile
  },
)
