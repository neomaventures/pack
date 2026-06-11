import { faker } from "@faker-js/faker"
import { multerFile } from "@neomaventures/fixtures"

import { type Storable } from "../../src/interfaces/storable.interface"

const storable = (overrides: Partial<Storable> = {}): Storable => ({
  id: faker.number.int(),
  originalName: faker.system.fileName(),
  mimeType: faker.system.mimeType(),
  size: faker.number.int({ min: 1, max: 10_000_000 }),
  key: `uploads/${faker.string.alphanumeric(26)}-${faker.system.fileName()}`,
  bucket: faker.string.alphanumeric(10),
  ...overrides,
})

export const factories = {
  storable,
  multerFile,
}
