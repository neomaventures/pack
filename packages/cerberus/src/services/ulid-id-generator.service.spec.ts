import { UlidIdGenerator } from "./ulid-id-generator.service"

describe("UlidIdGenerator", () => {
  let generator: UlidIdGenerator

  beforeEach(() => {
    generator = new UlidIdGenerator()
  })

  describe("generate()", () => {
    it("should return a 26-character ULID string", () => {
      const id = generator.generate()

      expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
    })

    it("should return a unique value on each call", () => {
      const ids = new Set(
        Array.from({ length: 100 }, () => generator.generate()),
      )

      expect(ids.size).toBe(100)
    })
  })
})
