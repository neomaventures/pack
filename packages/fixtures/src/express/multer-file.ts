/// <reference types="multer" />
import { faker } from "@faker-js/faker"

/**
 * Generates a mock `Express.Multer.File` with realistic faker defaults.
 * Override any property by passing a partial object.
 *
 * @param overrides - Properties to override the generated defaults.
 * @returns An object conforming to the `Express.Multer.File` interface.
 */
export const multerFile = ({
  fieldname = "file",
  originalname = faker.system.fileName(),
  encoding = "7bit",
  mimetype = "text/plain",
  size = faker.number.int({ min: 100, max: 5000 }),
  buffer = Buffer.from(faker.string.alpha(size)),
  destination = "",
  filename = "",
  path = "",
  stream = undefined as any,
  ...rest
}: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
  fieldname,
  originalname,
  encoding,
  mimetype,
  size,
  buffer,
  destination,
  filename,
  path,
  stream,
  ...rest,
})
