import { faker } from "@faker-js/faker"
import { express, executionContext } from "@neomaventures/fixtures"
import { ExecutionContext, NotFoundException } from "@nestjs/common"
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants"

import { factories } from "../../test/factories"
import { RouteModelBindingNotAppliedException } from "../exceptions/route-model-binding-not-applied.exception"

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
  const user = factories.user()
  const post = factories.post()
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

  describe("When the entity is null", () => {
    const entityId = faker.string.uuid()

    describe("And routeModelMeta is populated", () => {
      it("should throw a NotFoundException with entityName and id", () => {
        const context = <ExecutionContext>executionContext(
          express.request({
            routeModels: { user: null },
            routeModelMeta: {
              user: { id: entityId, entityName: "User" },
            },
          }),
        )

        expect(() => userDecorator("user", context)).toThrow(NotFoundException)
        expect(() => userDecorator("user", context)).toThrow(
          `Could not find User with id ${entityId}`,
        )
      })
    })

    describe("And routeModelMeta is undefined", () => {
      it("should throw a NotFoundException with fallback values", () => {
        const context = <ExecutionContext>executionContext(
          express.request({
            routeModels: { user: null },
          }),
        )

        expect(() => userDecorator("user", context)).toThrow(NotFoundException)
        expect(() => userDecorator("user", context)).toThrow(
          "Could not find user with id unknown",
        )
      })
    })
  })

  describe("When routeModels is undefined", () => {
    it("should throw a RouteModelBindingNotAppliedException", () => {
      const context = <ExecutionContext>executionContext(express.request({}))

      expect(() => userDecorator("user", context)).toThrow(
        RouteModelBindingNotAppliedException,
      )
    })

    it("should include the requested param name on the exception", () => {
      const context = <ExecutionContext>executionContext(express.request({}))

      expect(() => userDecorator("user", context)).toThrowMatching(
        RouteModelBindingNotAppliedException,
        { paramName: "user" },
      )
    })

    it("should throw with a message that mentions the param name", () => {
      const context = <ExecutionContext>executionContext(express.request({}))

      expect(() => userDecorator("user", context)).toThrow(/"user"/)
    })

    it("should throw with a message that mentions RouteModelBindingMiddleware", () => {
      const context = <ExecutionContext>executionContext(express.request({}))

      expect(() => userDecorator("user", context)).toThrow(
        /RouteModelBindingMiddleware/,
      )
    })
  })

  describe("When the key does not exist in routeModels", () => {
    it("should throw a NotFoundException", () => {
      const context = <ExecutionContext>executionContext(
        express.request({
          routeModels: { post },
        }),
      )

      expect(() => userDecorator("user", context)).toThrow(NotFoundException)
    })
  })
})
