import { faker } from "@faker-js/faker"
import { plainToInstance } from "class-transformer"
import { validate } from "class-validator"

import { SignupDto } from "./signup.dto"

describe("SignupDto", () => {
  describe("Given a valid email", () => {
    it("should pass validation", async () => {
      const dto = plainToInstance(SignupDto, {
        email: faker.internet.email(),
      })

      const errors = await validate(dto)

      expect(errors).toHaveLength(0)
    })
  })

  describe("Given an invalid email", () => {
    it("should fail validation with an email constraint", async () => {
      const dto = plainToInstance(SignupDto, {
        email: faker.string.alpha(10),
      })

      const errors = await validate(dto)

      expect(errors).toHaveLength(1)

      const firstError = errors[0]
      expect(firstError).toBeDefined()
      expect(firstError?.constraints).toMatchObject({
        isEmail: expect.stringContaining("email must be an email"),
      })
    })
  })

  describe("Given an empty email", () => {
    it("should fail validation with a not-empty constraint", async () => {
      const dto = plainToInstance(SignupDto, { email: "" })

      const errors = await validate(dto, { stopAtFirstError: true })

      expect(errors).toHaveLength(1)

      const firstError = errors[0]
      expect(firstError).toBeDefined()
      expect(firstError?.constraints).toBeDefined()
    })
  })

  describe("Given no email field", () => {
    it("should fail validation", async () => {
      const dto = plainToInstance(SignupDto, {})

      const errors = await validate(dto)

      expect(errors).toHaveLength(1)
    })
  })
})
