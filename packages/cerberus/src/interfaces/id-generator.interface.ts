/**
 * Generates unique identifiers for stored file keys.
 *
 * The default implementation (`UlidIdGenerator`) produces ULIDs. To customise,
 * implement this interface and override the `UlidIdGenerator` provider.
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class FixedIdGenerator implements CerberusIdGenerator {
 *   public generate(): string {
 *     return "fixed-id"
 *   }
 * }
 * ```
 */
export interface CerberusIdGenerator {
  generate(): string
}
