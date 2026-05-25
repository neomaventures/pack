import { Column, getMetadataArgsStorage } from "typeorm"

import { getActor } from "../argos.store"

type EntityListenerEvent = "before-insert" | "before-update"

/**
 * Internal factory for actor-tracking column decorators.
 *
 * Applies a `@Column({ type: "varchar", nullable: true })` and registers
 * TypeORM entity listeners that populate the column with the current actor
 * from {@link getActor}.
 *
 * Listener methods are defined as non-enumerable properties on the entity
 * prototype with the naming convention `__argos${name}_${propertyKey}`
 * to avoid collisions and keep them out of serialised snapshots.
 *
 * @param name - Decorator name used in the listener method key (e.g. "CreatedBy")
 * @param events - TypeORM lifecycle events to listen on
 */
export function actorColumn(
  name: string,
  events: EntityListenerEvent[],
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    Column({ type: "varchar", nullable: true })(target, propertyKey)

    const methodName = `__argos${name}_${String(propertyKey)}`

    Object.defineProperty(target, methodName, {
      value: function (this: Record<PropertyKey, unknown>): void {
        this[propertyKey] = getActor()
      },
      writable: true,
      enumerable: false,
      configurable: true,
    })

    for (const type of events) {
      getMetadataArgsStorage().entityListeners.push({
        target: target.constructor,
        propertyName: methodName,
        type,
      })
    }
  }
}
