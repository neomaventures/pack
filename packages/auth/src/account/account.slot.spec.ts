import {
  NoContextError,
  RequestContextModule,
} from "@neomaventures/request-context"
import { Inject, Injectable } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { ClsService } from "nestjs-cls"

import { type Account } from "../entities/account.entity"
import { fakeAccount } from "../testing"

import {
  accountProvider,
  CurrentAccountToken,
  getAccount,
  setAccount,
} from "./account.slot"

describe("account.slot", () => {
  let cls: ClsService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [RequestContextModule.forRoot()],
    }).compile()

    cls = module.get(ClsService)
  })

  describe("getAccount()", () => {
    describe("Given a CLS context with an account set via setAccount()", () => {
      it("should return the account", () => {
        const account = fakeAccount()

        const result = cls.run(() => {
          setAccount(account)
          return getAccount()
        })

        expect(result).toBe(account)
      })
    })

    describe("Given an active CLS context with no account set", () => {
      it("should return undefined", () => {
        const result = cls.run(() => getAccount())
        expect(result).toBeUndefined()
      })
    })

    describe("Given no active CLS context", () => {
      it("should return undefined", () => {
        expect(getAccount()).toBeUndefined()
      })
    })
  })

  describe("setAccount()", () => {
    describe("Given an active CLS context", () => {
      it("should store the account so getAccount() can retrieve it", () => {
        const account = fakeAccount()

        const result = cls.run(() => {
          setAccount(account)
          return getAccount()
        })

        expect(result).toBe(account)
      })
    })

    describe("Given no active CLS context", () => {
      it("should throw NoContextError", () => {
        expect(() => setAccount(fakeAccount())).toThrow(NoContextError)
      })
    })
  })

  describe("CurrentAccountToken (@Inject)", () => {
    @Injectable()
    class TestService {
      public constructor(
        @Inject(CurrentAccountToken)
        private readonly account: Account,
      ) {}

      public getId(): string | undefined {
        return this.account?.id
      }

      public getEmail(): string | undefined {
        return this.account?.email
      }
    }

    let service: TestService

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [RequestContextModule.forRoot()],
        providers: [accountProvider, TestService],
      }).compile()

      cls = module.get(ClsService)
      service = module.get(TestService)
    })

    describe("Given an account has been stored in the CLS context", () => {
      it("should resolve the account's properties via the proxy", () => {
        const account = fakeAccount()

        cls.run(() => {
          setAccount(account)
          expect(service.getId()).toBe(account.id)
          expect(service.getEmail()).toBe(account.email)
        })
      })
    })

    describe("Given no account has been stored in the CLS context", () => {
      it("should return undefined for property access", () => {
        cls.run(() => {
          expect(service.getId()).toBeUndefined()
          expect(service.getEmail()).toBeUndefined()
        })
      })
    })
  })
})
