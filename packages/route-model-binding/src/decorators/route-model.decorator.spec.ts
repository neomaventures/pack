import { express, executionContext } from "@neomaventures/fixtures"
import { ExecutionContext } from "@nestjs/common"
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants"
import { post as postEntity } from "fixtures/models/post"
import { user as userEntity } from "fixtures/models/user"

import { RouteModel } from "./route-model.decorator"

/**
 * Definition of a the object returned from Reflect.getMetadata
 * when creating a CustomParameterDecorator, used for testing
 * ParameterDecorators.
 */
type Args = Record<
  string,
  { factory: (...dataOrPipes: any[]) => ParameterDecorator }
>

describe("RouteModel", () => {
  const user = userEntity.entity()
  const post = postEntity.entity()
  let userDecorator: typeof RouteModel
  let postDecorator: typeof RouteModel

  beforeAll(() => {
    class RouteModelTest {
      public test(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @RouteModel("user") _value1: any,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        @RouteModel("post") _value2: any,
      ): void {}
    }

    const args = <Args>(
      Reflect.getMetadata(ROUTE_ARGS_METADATA, RouteModelTest, "test")
    )

    userDecorator = args[Object.keys(args)[0]].factory
    postDecorator = args[Object.keys(args)[1]].factory
  })

  describe("When it's called with the data 'user'", () => {
    describe("And a request object that has a req.routeModels.user property", () => {
      it("It should return the user object.", () => {
        const context = <ExecutionContext>executionContext(
          express.request({
            routeModels: { user, post },
          }),
        )
        expect(userDecorator("user", context)).toEqual(user)
      })
    })
  })

  describe("When it's called with the data 'post'", () => {
    describe("And a request object that has a req.routeModels.post property", () => {
      it("It should return the post object.", () => {
        const context = <ExecutionContext>executionContext(
          express.request({
            routeModels: { user, post },
          }),
        )
        expect(postDecorator("post", context)).toEqual(post)
      })
    })
  })
})
