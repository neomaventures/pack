import { Injectable } from "@nestjs/common"
import { type Request } from "express"

import { type CerberusIdGenerator } from "../interfaces/id-generator.interface"
import { type OriginalFileInfo } from "../interfaces/key-resolver.interface"

/**
 * Internal default key resolver used when no custom `key` option is supplied
 * to `@Upload()`. Produces keys in the form `${id}-${basename}`, stripping any
 * path components from the original filename to prevent path-traversal in
 * the stored object key.
 *
 * Not a {@link CerberusKeyResolver} — the default's role is to *produce* the
 * baseline key from raw inputs, whereas a `CerberusKeyResolver` consumes the
 * baseline (via `file.defaultKey`) to decorate it with context. The signatures
 * differ deliberately.
 *
 * Example: `photo.jpg` → `01HXYZ...-photo.jpg`
 * Example: `../../etc/passwd` → `01HXYZ...-passwd`
 */
@Injectable()
export class DefaultKeyResolver {
  /**
   * Generates the S3 object key for an uploaded file using the default format.
   * Strips any path components from the original filename to prevent path-traversal
   * vulnerabilities.
   *
   * @param _req The Express request object (not used in this resolver)
   * @param idGenerator The ID generator to create a unique prefix for the key-resolver
   * @param file Information about the uploaded file, including the original filename
   *
   * @returns A string in the format `${id}-${basename}`, where `id` is generated
   */
  public resolve(
    _req: Request,
    idGenerator: CerberusIdGenerator,
    file: OriginalFileInfo,
  ): string {
    const id = idGenerator.generate()
    const safeName = file.originalName.replace(/^.*[/\\]/, "")
    return `${id}-${safeName}`
  }
}
