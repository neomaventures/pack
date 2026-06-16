import { faker } from "@faker-js/faker"
import { RequestContextModule } from "@neomaventures/request-context"
import { type ExecutionContext } from "@nestjs/common"
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants"
import { CustomParamFactory } from "@nestjs/common/interfaces"
import { Test } from "@nestjs/testing"
import { ClsService } from "nestjs-cls"

import { setAccount } from "../account/account.slot"
import { Account } from "../entities/account.entity"

import { CurrentAccount } from "./current-account.decorator"

/**
 * Definition of the object returned from Reflect.getMetadata
 * when creating a CustomParameterDecorator, used for testing
 * ParameterDecorators.
 */
type Args = Record<string, { factory: CustomParamFactory }>

describe("CurrentAccountDecorator", () => {
  let factory: CustomParamFactory
  let cls: ClsService

  beforeAll(async () => {
    class CurrentAccountDecoratorTest {
      // eslint-disable-next-line
      public test(@CurrentAccount() _value: Account): void {}
    }

    const args = <Args>(
      Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        CurrentAccountDecoratorTest,
        "test",
      )
    )

    factory = args[Object.keys(args)[0]].factory

    const module = await Test.createTestingModule({
      imports: [RequestContextModule.forRoot()],
    }).compile()

    cls = module.get(ClsService)
  })

  describe("Given an account has been stored in the CLS context", () => {
    it("should return the account", () => {
      const account = new Account()
      account.id = faker.string.uuid()
      account.email = faker.internet.email()

      cls.run(() => {
        setAccount(account)
        expect(factory(null, {} as unknown as ExecutionContext)).toEqual(
          account,
        )
      })
    })
  })

  describe("Given an account hasn't been stored in the CLS context", () => {
    it("should return undefined", () => {
      cls.run(() => {
        expect(factory(null, {} as unknown as ExecutionContext)).toBeUndefined()
      })
    })
  })
})
