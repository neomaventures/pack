import { faker } from "@faker-js/faker"
import { runInRequestContext } from "@neomaventures/request-context/testing"
import { type ExecutionContext } from "@nestjs/common"
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants"
import { CustomParamFactory } from "@nestjs/common/interfaces"

import { Account } from "../entities/account.entity"
import { runInAuthContext } from "../testing"

import { AuthenticatedAccount } from "./authenticated-account.decorator"

/**
 * Definition of the object returned from Reflect.getMetadata
 * when creating a CustomParameterDecorator, used for testing
 * ParameterDecorators.
 */
type Args = Record<string, { factory: CustomParamFactory }>

describe("AuthenticatedAccountDecorator", () => {
  let factory: CustomParamFactory

  beforeAll(() => {
    class AuthenticatedAccountDecoratorTest {
      // eslint-disable-next-line
      public test(@AuthenticatedAccount() _value: Account): void {}
    }

    const args = <Args>(
      Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        AuthenticatedAccountDecoratorTest,
        "test",
      )
    )

    factory = args[Object.keys(args)[0]].factory
  })

  describe("Given an account has been stored in the CLS context", () => {
    it("should return the account", async () => {
      const account = new Account()
      account.id = faker.string.uuid()
      account.email = faker.internet.email()

      await runInAuthContext(account, async () => {
        expect(factory(null, {} as unknown as ExecutionContext)).toEqual(
          account,
        )
      })
    })
  })

  describe("Given an account hasn't been stored in the CLS context", () => {
    it("should return undefined", async () => {
      await runInRequestContext(async () => {
        expect(factory(null, {} as unknown as ExecutionContext)).toBeUndefined()
      })
    })
  })
})
