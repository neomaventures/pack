import { type Storable } from "../interfaces/storable.interface"

/**
 * Event emitted after a file has been successfully uploaded to S3 and the
 * Storable entity has been persisted to the database, but **before** the
 * consumer route handler runs.
 *
 * Because the event fires pre-handler, listeners must not assume any
 * consumer-side wiring (e.g. foreign keys joining the file to a parent
 * record) has happened yet. Use this event for storage-layer concerns —
 * thumbnail generation, virus scanning, extraction — not for business
 * logic that depends on the handler completing.
 *
 * @example
 * ```typescript
 * @OnEvent(FileCreatedEvent.EVENT_NAME)
 * public handleFileCreated(event: FileCreatedEvent<Upload>): void {
 *   console.log('File created:', event.entity.key)
 * }
 * ```
 */
export class FileCreatedEvent<T extends Storable = Storable> {
  public static readonly EVENT_NAME = "storage.file.created"

  public constructor(public readonly entity: T) {}
}
