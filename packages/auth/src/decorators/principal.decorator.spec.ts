import { faker } from "@faker-js/faker"
import { RequestContextModule } from "@neomaventures/request-context"
import { type ExecutionContext } from "@nestjs/common"
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants"
import { CustomParamFactory } from "@nestjs/common/interfaces"
import { Test } from "@nestjs/testing"
import { ClsService } from "nestjs-cls"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

import { Authenticatable } from "../interfaces/authenticatable.interface"
import { setPrincipal } from "../principal/principal.slot"

import { Principal } from "./principal.decorator"

/**
 * Definition of the object returned from Reflect.getMetadata
 * when creating a CustomParameterDecorator, used for testing
 * ParameterDecorators.
 */
type Args = Record<string, { factory: CustomParamFactory }>

@Entity()
class User implements Authenticatable {
  @PrimaryGeneratedColumn()
  public id!: number

  @Column()
  public email!: string

  @Column()
  public password!: string
}

describe("PrincipalDecorator", () => {
  let factory: CustomParamFactory
  let cls: ClsService

  beforeAll(async () => {
    class PrincipalDecoratorTest {
      // eslint-disable-next-line
      public test(@Principal() _value: User): void {}
    }

    const args = <Args>(
      Reflect.getMetadata(ROUTE_ARGS_METADATA, PrincipalDecoratorTest, "test")
    )

    factory = args[Object.keys(args)[0]].factory

    const module = await Test.createTestingModule({
      imports: [RequestContextModule.forRoot()],
    }).compile()

    cls = module.get(ClsService)
  })

  describe("Given a principal has been stored in the CLS context", () => {
    it("should return the principal", () => {
      const principal = {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        password: faker.internet.password(),
      }

      cls.run(() => {
        setPrincipal(principal)
        expect(factory(null, {} as unknown as ExecutionContext)).toEqual(
          principal,
        )
      })
    })
  })

  describe("Given a principal hasn't been stored in the CLS context", () => {
    it("should return undefined", () => {
      cls.run(() => {
        expect(factory(null, {} as unknown as ExecutionContext)).toBeUndefined()
      })
    })
  })
})
