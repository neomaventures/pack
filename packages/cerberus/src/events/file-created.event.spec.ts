import { faker } from "@faker-js/faker"

import { type Storable } from "../interfaces/storable.interface"

import { FileCreatedEvent } from "./file-created.event"

describe("FileCreatedEvent", () => {
  describe("EVENT_NAME", () => {
    it("should equal 'cerberus.file.created'", () => {
      expect(FileCreatedEvent.EVENT_NAME).toBe("cerberus.file.created")
    })
  })

  describe("constructor", () => {
    it("should store the entity as a readonly property", () => {
      const entity: Storable = {
        id: faker.number.int(),
        originalName: faker.system.fileName(),
        mimeType: faker.system.mimeType(),
        size: faker.number.int({ min: 100, max: 5000 }),
        key: faker.string.alphanumeric(20),
        bucket: faker.string.alphanumeric(10),
      }

      const event = new FileCreatedEvent(entity)

      expect(event.entity).toBe(entity)
    })
  })
})
