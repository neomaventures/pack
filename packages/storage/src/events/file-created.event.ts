import { type Storable } from "../interfaces/storable.interface"

/**
 * Event emitted after a file has been successfully uploaded to S3
 * and the entity has been persisted to the database.
 *
 * Consumers listen with `@OnEvent('storage.file.created')` for downstream
 * processing such as thumbnail generation, virus scanning, or extraction.
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
