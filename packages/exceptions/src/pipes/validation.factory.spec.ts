import { faker } from "@faker-js/faker"
import { validationFactory } from "@neomaventures/exceptions"
import { BadRequestException } from "@nestjs/common"
import { IsEmail, MinLength, ValidateNested, validate } from "class-validator"

const { hacker, internet, string } = faker
const nameMessage = hacker.phrase()
const emailMessage = hacker.phrase()
const streetMessage = hacker.phrase()

class TestDto {
  @MinLength(5, { message: nameMessage })
  public name!: string

  @IsEmail({}, { message: emailMessage })
  public email!: string
}

class AddressDto {
  @MinLength(5, { message: streetMessage })
  public street!: string
}

class OrderDto {
  @ValidateNested()
  public address!: AddressDto
}

describe("validationFactory", () => {
  describe("When it is called with a validation error", () => {
    it("should map the value and error to the name of its property", async () => {
      const invalidName = string.alphanumeric(4)
      const dto = Object.assign(new TestDto(), {
        name: invalidName,
        email: internet.email(),
      })

      const errors = await validate(dto)

      const error = validationFactory(errors)
      expect(error).toBeInstanceOf(BadRequestException)
      expect(error.getResponse()).toMatchObject({
        name: {
          value: invalidName,
          error: nameMessage,
        },
      })
    })
  })

  describe("When it is called with multiple validation errors", () => {
    it("should map the value and error to the name of each property that the errors represent", async () => {
      const invalidName = string.alphanumeric(4)
      const invalidEmail = string.alphanumeric(4)
      const dto = Object.assign(new TestDto(), {
        name: invalidName,
        email: invalidEmail,
      })

      const errors = await validate(dto)

      const error = validationFactory(errors)
      expect(error).toBeInstanceOf(BadRequestException)
      expect(error.getResponse()).toMatchObject({
        name: {
          value: invalidName,
          error: nameMessage,
        },
        email: {
          value: invalidEmail,
          error: emailMessage,
        },
      })
    })
  })

  describe("When it is called with a nested validation error", () => {
    it("should recurse into children instead of throwing", async () => {
      const invalidStreet = string.alphanumeric(4)
      const dto = Object.assign(new OrderDto(), {
        address: Object.assign(new AddressDto(), { street: invalidStreet }),
      })

      const errors = await validate(dto)

      const error = validationFactory(errors)
      expect(error).toBeInstanceOf(BadRequestException)
      expect(error.getResponse()).toMatchObject({
        address: {
          street: { value: invalidStreet, error: streetMessage },
        },
      })
    })
  })
})
