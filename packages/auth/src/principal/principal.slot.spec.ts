import {
  NoContextError,
  RequestContextModule,
} from "@neomaventures/request-context"
import { Inject, Injectable } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { ClsService } from "nestjs-cls"

import * as fakes from "../../fixtures/fakes/principal"
import { type Authenticatable } from "../interfaces/authenticatable.interface"

import {
  CurrentPrincipal,
  getPrincipal,
  principalProvider,
  setPrincipal,
} from "./principal.slot"

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
        const principal = fakes.principal()

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
        const principal = fakes.principal()

        const result = cls.run(() => {
          setPrincipal(principal)
          return getPrincipal()
        })

        expect(result).toBe(principal)
      })
    })

    describe("Given no active CLS context", () => {
      it("should throw NoContextError", () => {
        expect(() => setPrincipal(fakes.principal())).toThrow(
          NoContextError,
        )
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
        const principal = fakes.principal()

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
