import { faker } from "@faker-js/faker"
import { Inject, Injectable } from "@nestjs/common"
import { RequestContextModule } from "@neomaventures/request-context"
import { Test } from "@nestjs/testing"
import { ClsService } from "nestjs-cls"

import { type Authenticatable } from "../interfaces/authenticatable.interface"

import {
  CurrentPrincipal,
  getPrincipal,
  principalProvider,
  setPrincipal,
} from "./principal.slot"

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

    describe("Given no active CLS context", () => {
      it("should throw", () => {
        expect(() => setPrincipal(fakePrincipal())).toThrow()
      })
    })
  })

  describe("CurrentPrincipal (@Inject)", () => {
    @Injectable()
    class TestService {
      public constructor(
        @Inject(CurrentPrincipal)
        private readonly principal: Authenticatable,
      ) {}

      public getId(): string | undefined {
        return this.principal?.id
      }

      public getEmail(): string | undefined {
        return this.principal?.email
      }
    }

    let service: TestService

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [RequestContextModule.forRoot()],
        providers: [principalProvider, TestService],
      }).compile()

      cls = module.get(ClsService)
      service = module.get(TestService)
    })

    describe("Given a principal has been stored in the CLS context", () => {
      it("should resolve the principal's properties via the proxy", () => {
        const principal = fakePrincipal()

        cls.run(() => {
          setPrincipal(principal)
          expect(service.getId()).toBe(principal.id)
          expect(service.getEmail()).toBe(principal.email)
        })
      })
    })

    describe("Given no principal has been stored in the CLS context", () => {
      it("should return undefined for property access", () => {
        cls.run(() => {
          expect(service.getId()).toBeUndefined()
          expect(service.getEmail()).toBeUndefined()
        })
      })
    })
  })
})
