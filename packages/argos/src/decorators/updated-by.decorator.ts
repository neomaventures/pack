import { actorColumn } from "./actor-column"

/**
 * Column decorator that records who last modified the entity.
 *
 * Populates the column with the current actor from AsyncLocalStorage
 * on both insert and update.
 *
 * @example
 * ```typescript
 * @Entity()
 * export class Invoice {
 *   @UpdatedBy()
 *   public updatedBy!: string
 * }
 * ```
 */
export function UpdatedBy(): PropertyDecorator {
  return actorColumn("UpdatedBy", ["before-insert", "before-update"])
}
