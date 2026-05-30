import { type CerberusIdGenerator } from "@neoma/storage"
import { Injectable } from "@nestjs/common"
import { ulid } from "ulid"

/**
 * Test ID generator that produces ULID-based identifiers
 * and stores them in an array for later retrieval in tests
 *
 * ULIDs are time-sortable and globally unique, making them
 * ideal for unique S3 object keys.
 */
@Injectable()
export class TestIdGenerator implements CerberusIdGenerator {
  private ids: string[] = []

  /**
   * Generates a new ULID ID, stores it in the IDs array, and returns it.
   * This allows tests to access the generated IDs for verification.
   *
   * @return The generated ULID ID.
   *
   * @remarks The generated ID is stored in the IDs array for later retrieval in tests,
   * use the lastId() method to access the most recently generated ID.
   */
  public generate(): string {
    this.ids.push(ulid())
    return this.ids[this.ids.length - 1]
  }

  /**
   * Returns the last generated ID from the IDs array, or undefined if no IDs have been generated.
   * This allows tests to access the most recently generated ID for verification.
   * @return The last generated ID, or undefined if no IDs have been generated.
   */
  public lastId(): string | undefined {
    return this.ids[this.ids.length - 1]
  }
}
