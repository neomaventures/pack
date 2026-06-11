import { factories } from "../../test/factories"
import { type Storable } from "../interfaces/storable.interface"

import { FileCreatedEvent } from "./file-created.event"

describe("FileCreatedEvent", () => {
  describe("EVENT_NAME", () => {
    it("should equal 'storage.file.created'", () => {
      expect(FileCreatedEvent.EVENT_NAME).toBe("storage.file.created")
    })
  })

  describe("constructor", () => {
    it("should store the entity as a readonly property", () => {
      const entity: Storable = factories.storable()

      const event = new FileCreatedEvent(entity)

      expect(event.entity).toBe(entity)
    })
  })
})
