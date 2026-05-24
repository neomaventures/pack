import {
  type CerberusIdGenerator,
  type CerberusKeyResolver,
  type OriginalFileInfo,
} from "@neoma/cerberus"
import { Injectable } from "@nestjs/common"
import { type Request } from "express"

/**
 * A test implementation of the CerberusKeyResolver interface that generates a
 * custom file name using the request headers, an ID generator, and the original
 * file name.
 */
@Injectable()
export class TestKeyResolver implements CerberusKeyResolver {
  private keys: string[] = []

  /**
   * Resolves a custom file name for the uploaded file based on the request headers,
   * an ID generator, and the original file name.
   *
   * @param req - The Express request object containing the headers.
   * @param idGenerator - An object with a generate method that produces unique IDs.
   * @param file - An object representing the uploaded file, containing the original name.
   *
   * @returns A custom file name string that incorporates the generated ID, a custom header value, and the original file name.
   */
  public resolve(
    req: Request,
    idGenerator: CerberusIdGenerator,
    file: OriginalFileInfo & { defaultKey: string },
  ): string {
    // Make a custom file name that uses all params to exercise the key resolver functionality.
    const customFileName = req.headers["x-custom-filename"]
    this.keys.push(`${idGenerator.generate()}-${customFileName}-${file.size}`)
    return this.lastKey()!
  }

  /**
   * Returns the last generated key from the keys array, or null if no keys have been generated.
   *
   * @returns The last generated key as a string, or null if the keys array is empty.
   */
  public lastKey(): string | null {
    return this.keys.length > 0 ? this.keys[this.keys.length - 1] : null
  }
}
