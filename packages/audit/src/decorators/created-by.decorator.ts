import { actorColumn } from "./actor-column"

/**
 * Column decorator that records who created the entity.
 *
 * Populates the column with the current actor from AsyncLocalStorage
 * on insert. The value is never overwritten on subsequent updates.
 *
 * @example
 * ```typescript
 * @Entity()
 * export class Invoice {
 *   @CreatedBy()
 *   public createdBy!: string
 * }
 * ```
 */
export function CreatedBy(): PropertyDecorator {
  return actorColumn("CreatedBy", ["before-insert"])
}
