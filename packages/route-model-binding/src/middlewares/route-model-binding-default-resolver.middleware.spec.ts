import { express, type MockRequest } from "@neomaventures/fixtures"
import { managedDatasourceInstance } from "@neomaventures/managed-database"
import { type Provider } from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"
import { getDataSourceToken } from "@nestjs/typeorm"
import { type Request, type Response } from "express"
import { sqlInjectionAttempts } from "fixtures/database/sql-injection"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"
import { type DataSource } from "typeorm"

import { factories } from "../../test/factories"
import { ROUTE_MODEL_BINDING_CONFIG } from "../constants/injection-tokens"
import { type RouteModelBindingConfig } from "../interfaces/route-model-binding-config.interface"
import { DEFAULT_RESOLVER } from "../modules/route-model-binding.module"

import { RouteModelBindingMiddleware } from "./route-model-binding.middleware"

describe("RouteModelBindingMiddleware", () => {
  const user = factories.user()
  const post = factories.post()
  const nonExistentId = crypto.randomUUID()
  let middleware: RouteModelBindingMiddleware

  const createMiddleware = async (
    datasource: DataSource,
    config?: RouteModelBindingConfig,
  ): Promise<RouteModelBindingMiddleware> => {
    const providers: Provider[] = [
      RouteModelBindingMiddleware,
      {
        provide: getDataSourceToken(),
        useValue: datasource,
      },
      {
        provide: ROUTE_MODEL_BINDING_CONFIG,
        useValue: config ?? { defaultResolver: DEFAULT_RESOLVER },
      },
    ]

    const app: TestingModule = await Test.createTestingModule({
      providers,
    }).compile()

    return app.get(RouteModelBindingMiddleware)
  }

  beforeEach(async () => {
    const datasource = await managedDatasourceInstance([
      "e2e/app/**/*.entity.ts",
    ])
    middleware = await createMiddleware(datasource)

    await datasource
      .getRepository(User)
      .save([factories.user(), factories.user(), user, factories.user()])

    await datasource
      .getRepository(Post)
      .save([factories.post(), factories.post(), post])
  })

  describe(`Given a User Entity exists with the id ${user.id} and a Post Entity exists with the id ${post.id}`, () => {
    describe(`And req.params.user has the value ${user.id} and req.params.post has the value ${post.id}`, () => {
      let request: MockRequest
      beforeEach((done) => {
        request = express.request({
          params: { user: user.id, post: post.id },
        })

        void middleware.use(
          request as unknown as Request,
          express.response() as unknown as Response,
          done,
        )
      })

      it(`should find the User with the id ${user.id} and assign it to req.routeModels.user`, () => {
        expect(request).toHaveProperty("routeModels.user", user)
      })

      it(`should find the Post with the id ${post.id} and assign it to req.routeModels.post`, () => {
        expect(request).toHaveProperty("routeModels.post", post)
      })
    })

    describe(`And req.params.USER has the value ${user.id} and req.params.POST has the value ${post.id}`, () => {
      let request: MockRequest
      beforeEach((done) => {
        request = express.request({
          params: { USER: user.id, POST: post.id },
        })

        void middleware.use(
          request as unknown as Request,
          express.response() as unknown as Response,
          done,
        )
      })

      it(`should find the User with the id ${user.id} and assign it to req.routeModels.USER`, () => {
        expect(request).toHaveProperty("routeModels.USER", user)
      })

      it(`should find the Post with the id ${post.id} and assign it to req.routeModels.POST`, () => {
        expect(request).toHaveProperty("routeModels.POST", post)
      })
    })

    describe(`And req.params.user has the value ${nonExistentId} of a user that doesn't exist`, () => {
      let request: MockRequest
      const next = jest.fn()

      beforeEach(async () => {
        request = express.request({
          params: { user: nonExistentId, post: post.id },
        })

        await middleware.use(
          request as unknown as Request,
          express.response() as unknown as Response,
          next,
        )
      })

      it("should call next()", () => {
        expect(next).toHaveBeenCalled()
      })

      it("should assign null to req.routeModels.user", () => {
        expect(request).toHaveProperty("routeModels.user", null)
      })

      it("should still populate routeModelMeta for the user", () => {
        expect(request).toHaveProperty("routeModelMeta.user", {
          id: nonExistentId,
          entityName: "User",
        })
      })
    })

    describe("And req.params.user has the value ''", () => {
      it("should throw an error", () => {
        return expect(
          middleware.use(
            express.request({ params: { user: "" } }) as unknown as Request,
            express.response() as unknown as Response,
            () => {},
          ),
        ).rejects.toThrow("InvalidArgumentError: The id for User is not valid")
      })
    })

    describe("And req.params.user has the value null", () => {
      it("should throw an error", () => {
        return expect(
          middleware.use(
            express.request({
              params: { user: null as unknown as string },
            }) as unknown as Request,
            express.response() as unknown as Response,
            () => {},
          ),
        ).rejects.toThrow("InvalidArgumentError: The id for User is not valid")
      })
    })

    describe(`And req.params.user has the value ${user.id} and req.params.post has the value ${nonExistentId} of a post that doesn't exist`, () => {
      let request: MockRequest
      const next = jest.fn()

      beforeEach(async () => {
        request = express.request({
          params: { user: user.id, post: nonExistentId },
        })

        await middleware.use(
          request as unknown as Request,
          express.response() as unknown as Response,
          next,
        )
      })

      it("should call next()", () => {
        expect(next).toHaveBeenCalled()
      })

      it("should assign null to req.routeModels.post", () => {
        expect(request).toHaveProperty("routeModels.post", null)
      })

      it("should still resolve the existing user", () => {
        expect(request).toHaveProperty("routeModels.user", user)
      })

      it("should still populate routeModelMeta for the post", () => {
        expect(request).toHaveProperty("routeModelMeta.post", {
          id: nonExistentId,
          entityName: "Post",
        })
      })
    })

    describe(`And req.params.user has the value ${user.id} and req.params.post has the value ''`, () => {
      it("should throw an error", () => {
        return expect(
          middleware.use(
            express.request({
              params: { user: user.id, post: "" },
            }) as unknown as Request,
            express.response() as unknown as Response,
            () => {},
          ),
        ).rejects.toThrow("InvalidArgumentError: The id for Post is not valid")
      })
    })

    describe(`And req.params.user has the value ${user.id} and req.params.post has the value null`, () => {
      it("should throw an error", () => {
        return expect(
          middleware.use(
            express.request({
              params: { user: user.id, post: null as unknown as string },
            }) as unknown as Request,
            express.response() as unknown as Response,
            () => {},
          ),
        ).rejects.toThrow("InvalidArgumentError: The id for Post is not valid")
      })
    })

    sqlInjectionAttempts.forEach((attempt) => {
      describe(`And req.params.user has the value ${attempt} and req.params.post has the value ${post.id}`, () => {
        let request: MockRequest
        const next = jest.fn()

        beforeEach(async () => {
          request = express.request({
            params: { user: attempt, post: post.id },
          })

          await middleware.use(
            request as unknown as Request,
            express.response() as unknown as Response,
            next,
          )
        })

        it("should call next()", () => {
          expect(next).toHaveBeenCalled()
        })

        it("should assign null to req.routeModels.user", () => {
          expect(request).toHaveProperty("routeModels.user", null)
        })

        it("should populate routeModelMeta for the user", () => {
          expect(request).toHaveProperty("routeModelMeta.user", {
            id: attempt,
            entityName: "User",
          })
        })
      })

      describe(`And req.params.user has the value ${user.id} and req.params.post has the value ${attempt}`, () => {
        let request: MockRequest
        const next = jest.fn()

        beforeEach(async () => {
          request = express.request({
            params: { user: user.id, post: attempt },
          })

          await middleware.use(
            request as unknown as Request,
            express.response() as unknown as Response,
            next,
          )
        })

        it("should call next()", () => {
          expect(next).toHaveBeenCalled()
        })

        it("should assign null to req.routeModels.post", () => {
          expect(request).toHaveProperty("routeModels.post", null)
        })

        it("should populate routeModelMeta for the post", () => {
          expect(request).toHaveProperty("routeModelMeta.post", {
            id: attempt,
            entityName: "Post",
          })
        })
      })
    })
  })

  describe("Custom Default Resolver Functionality", () => {
    describe("When the middleware is configured with a synchronous custom default resolver", () => {
      let customDefaultResolver: jest.Mock
      let middleware: RouteModelBindingMiddleware

      beforeEach(async () => {
        customDefaultResolver = jest
          .fn()
          .mockImplementation(({ id }) => ({ id }))

        middleware = await createMiddleware(
          await managedDatasourceInstance(["e2e/app/**/*.entity.ts"]),
          {
            defaultResolver: customDefaultResolver,
          },
        )
      })

      it("should use the custom default resolver to load any models", (done) => {
        const request = express.request({
          params: { user: user.id, post: post.id },
        }) as unknown as Request

        void middleware.use(
          request,
          express.response() as unknown as Response,
          () => {
            expect(request).toHaveProperty("routeModels.user", user)
            expect(request).toHaveProperty("routeModels.post", post)
            expect(customDefaultResolver).toHaveBeenCalledTimes(2)
            expect(customDefaultResolver).toHaveBeenNthCalledWith(1, {
              id: user.id,
              name: "user",
              req: request,
            })
            expect(customDefaultResolver).toHaveBeenNthCalledWith(2, {
              id: post.id,
              name: "post",
              req: request,
            })
            done()
          },
        )
      })
    })

    describe("When the middleware is configured with an asynchronous custom default resolver", () => {
      let customDefaultResolver: jest.Mock
      let middleware: RouteModelBindingMiddleware

      beforeEach(async () => {
        customDefaultResolver = jest
          .fn()
          .mockImplementation(({ id }) => Promise.resolve({ id }))

        middleware = await createMiddleware(
          await managedDatasourceInstance(["e2e/app/**/*.entity.ts"]),
          {
            defaultResolver: customDefaultResolver,
          },
        )
      })

      it("should await the custom default resolver and use it's result to load any models", (done) => {
        const request = express.request({
          params: { user: user.id, post: post.id },
        }) as unknown as Request

        void middleware.use(
          request,
          express.response() as unknown as Response,
          () => {
            expect(request).toHaveProperty("routeModels.user", user)
            expect(request).toHaveProperty("routeModels.post", post)
            expect(customDefaultResolver).toHaveBeenCalledTimes(2)
            expect(customDefaultResolver).toHaveBeenNthCalledWith(1, {
              id: user.id,
              name: "user",
              req: request,
            })
            expect(customDefaultResolver).toHaveBeenNthCalledWith(2, {
              id: post.id,
              name: "post",
              req: request,
            })
            done()
          },
        )
      })
    })
  })

  describe("Route Model Metadata", () => {
    describe("Given a single-param route", () => {
      let request: MockRequest

      beforeEach((done) => {
        request = express.request({
          params: { user: user.id },
        })

        void middleware.use(
          request as unknown as Request,
          express.response() as unknown as Response,
          done,
        )
      })

      it("should populate routeModelMeta with id and entityName", () => {
        expect(request).toHaveProperty("routeModelMeta.user", {
          id: user.id,
          entityName: "User",
        })
      })
    })

    describe("Given a multi-param route", () => {
      let request: MockRequest

      beforeEach((done) => {
        request = express.request({
          params: { user: user.id, post: post.id },
        })

        void middleware.use(
          request as unknown as Request,
          express.response() as unknown as Response,
          done,
        )
      })

      it("should populate routeModelMeta for each parameter", () => {
        expect(request).toHaveProperty("routeModelMeta.user", {
          id: user.id,
          entityName: "User",
        })
        expect(request).toHaveProperty("routeModelMeta.post", {
          id: post.id,
          entityName: "Post",
        })
      })
    })
  })

  describe("Parameter Resolver Functionality", () => {
    describe("When the middleware is configured with default resolver and a synchronous post parameter resolver", () => {
      let customDefaultResolver: jest.Mock
      let paramResolver: jest.Mock
      let middleware: RouteModelBindingMiddleware

      beforeEach(async () => {
        customDefaultResolver = jest
          .fn()
          .mockImplementation(({ id }) => ({ id }))

        paramResolver = jest.fn().mockImplementation(({ id }) => ({ id }))

        middleware = await createMiddleware(
          await managedDatasourceInstance(["e2e/app/**/*.entity.ts"]),
          {
            defaultResolver: customDefaultResolver,
            paramResolvers: { post: paramResolver },
          },
        )
      })

      it("should use the param resolver to load the post model and the default resolver to load the user model", (done) => {
        const request = express.request({
          params: { user: user.id, post: post.id },
        }) as unknown as Request

        void middleware.use(
          request,
          express.response() as unknown as Response,
          () => {
            expect(request).toHaveProperty("routeModels.user", user)
            expect(request).toHaveProperty("routeModels.post", post)

            expect(customDefaultResolver).toHaveBeenCalledTimes(1)
            expect(customDefaultResolver).toHaveBeenCalledWith({
              id: user.id,
              name: "user",
              req: request,
            })
            expect(paramResolver).toHaveBeenCalledTimes(1)
            expect(paramResolver).toHaveBeenCalledWith({
              id: post.id,
              name: "post",
              req: request,
            })
            done()
          },
        )
      })
    })

    describe("When the middleware is configured with default resolver and an asynchronous post parameter resolver", () => {
      let customDefaultResolver: jest.Mock
      let paramResolver: jest.Mock
      let middleware: RouteModelBindingMiddleware

      beforeEach(async () => {
        customDefaultResolver = jest
          .fn()
          .mockImplementation(({ id }) => ({ id }))

        paramResolver = jest
          .fn()
          .mockImplementation(({ id }) => Promise.resolve({ id }))

        middleware = await createMiddleware(
          await managedDatasourceInstance(["e2e/app/**/*.entity.ts"]),
          {
            defaultResolver: customDefaultResolver,
            paramResolvers: {
              post: paramResolver,
            },
          },
        )
      })

      it("should await the custom default resolver and use it's result to load any models", (done) => {
        const request = express.request({
          params: { user: user.id, post: post.id },
        }) as unknown as Request

        void middleware.use(
          request,
          express.response() as unknown as Response,
          () => {
            expect(request).toHaveProperty("routeModels.user", user)
            expect(request).toHaveProperty("routeModels.post", post)

            expect(customDefaultResolver).toHaveBeenCalledTimes(1)
            expect(customDefaultResolver).toHaveBeenCalledWith({
              id: user.id,
              name: "user",
              req: request,
            })
            expect(paramResolver).toHaveBeenCalledTimes(1)
            expect(paramResolver).toHaveBeenCalledWith({
              id: post.id,
              name: "post",
              req: request,
            })
            done()
          },
        )
      })
    })
  })
})
