import { Injectable } from "@nestjs/common"
import { ulid } from "ulid"

import { type CerberusIdGenerator } from "../interfaces/id-generator.interface"

/**
 * Default ID generator that produces ULID-based identifiers.
 *
 * ULIDs are time-sortable and globally unique, making them
 * ideal for unique S3 object keys.
 */
@Injectable()
export class UlidIdGenerator implements CerberusIdGenerator {
  /**
   * Generates a new ULID string to be used as a unique identifier.
   *
   * @returns A ULID string.
   */
  public generate(): string {
    return ulid()
  }
}
