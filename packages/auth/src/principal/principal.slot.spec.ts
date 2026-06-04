import { faker } from "@faker-js/faker"
import { RequestContextModule } from "@neomaventures/request-context"
import { Test } from "@nestjs/testing"
import { ClsService } from "nestjs-cls"

import { type Authenticatable } from "../interfaces/authenticatable.interface"

import { getPrincipal, setPrincipal } from "./principal.slot"

function fakePrincipal(): Authenticatable {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
  }
}

describe("principal.slot", () => {
  let cls: ClsService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [RequestContextModule.forRoot()],
    }).compile()

    cls = module.get(ClsService)
  })

  describe("getPrincipal()", () => {
    describe("Given a CLS context with a principal set via setPrincipal()", () => {
      it("should return the principal", () => {
        const principal = fakePrincipal()

        const result = cls.run(() => {
          setPrincipal(principal)
          return getPrincipal()
        })

        expect(result).toBe(principal)
      })
    })

    describe("Given an active CLS context with no principal set", () => {
      it("should return undefined", () => {
        const result = cls.run(() => getPrincipal())
        expect(result).toBeUndefined()
      })
    })

    describe("Given no active CLS context", () => {
      it("should return undefined", () => {
        expect(getPrincipal()).toBeUndefined()
      })
    })
  })

  describe("setPrincipal()", () => {
    describe("Given an active CLS context", () => {
      it("should store the principal so getPrincipal() can retrieve it", () => {
        const principal = fakePrincipal()

        const result = cls.run(() => {
          setPrincipal(principal)
          return getPrincipal()
        })

        expect(result).toBe(principal)
      })
    })
  })
})
