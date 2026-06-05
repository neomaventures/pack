import { express, type MockRequest } from "@neomaventures/fixtures"
import { managedDatasourceInstance } from "@neomaventures/managed-database"
import {
  ForbiddenException,
  NotFoundException,
  type Provider,
} from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"
import { getDataSourceToken } from "@nestjs/typeorm"
import { type Request, type Response } from "express"
import { sqlInjectionAttempts } from "fixtures/database/sql-injection"
import { post as postEntity } from "fixtures/models/post"
import { user as userEntity } from "fixtures/models/user"
import { Post } from "src/post.entity"
import { User } from "src/user.entity"
import { type DataSource } from "typeorm"

import {
  ROUTE_MODEL_BINDING_CONFIG,
  SCOPE_ACCESSOR,
} from "../constants/injection-tokens"
import { type RouteModelBindingConfig } from "../interfaces/route-model-binding-config.interface"
import { type ScopeAccessor } from "../interfaces/scope-accessor.interface"
import { DEFAULT_RESOLVER } from "../modules/route-model-binding.module"

import { RouteModelBindingMiddleware } from "./route-model-binding.middleware"

describe("RouteModelBindingMiddleware", () => {
  const user = userEntity.entity()
  const post = postEntity.entity()
  const nonExistentId = crypto.randomUUID()
  let middleware: RouteModelBindingMiddleware

  const createMiddleware = async (
    datasource: DataSource,
    config?: RouteModelBindingConfig,
    scopeAccessor?: ScopeAccessor,
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

    if (scopeAccessor) {
      providers.push({
        provide: SCOPE_ACCESSOR,
        useValue: scopeAccessor,
      })
    }

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
      .save([
        userEntity.entity(),
        userEntity.entity(),
        user,
        userEntity.entity(),
      ])

    await datasource
      .getRepository(Post)
      .save([postEntity.entity(), postEntity.entity(), post])
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
      it("it should throw a NotFoundException", () => {
        return expect(
          middleware.use(
            express.request({
              params: { user: nonExistentId, post: post.id },
            }) as unknown as Request,
            express.response() as unknown as Response,
            () => {},
          ),
        ).rejects.toMatchError(NotFoundException, {
          message: `Could not find User with id ${nonExistentId}`,
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
      it("it should throw a NotFoundException", () => {
        return expect(
          middleware.use(
            express.request({
              params: { user: user.id, post: nonExistentId },
            }) as unknown as Request,
            express.response() as unknown as Response,
            () => {},
          ),
        ).rejects.toMatchError(NotFoundException, {
          message: `Could not find Post with id ${nonExistentId}`,
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
        it("it should throw a NotFoundException", () => {
          return expect(
            middleware.use(
              express.request({
                params: { user: attempt, post: post.id },
              }) as unknown as Request,
              express.response() as unknown as Response,
              () => {},
            ),
          ).rejects.toMatchError(NotFoundException, {
            message: `Could not find User with id ${attempt}`,
          })
        })
      })

      describe(`And req.params.user has the value ${user.id} and req.params.post has the value ${attempt}`, () => {
        it("it should throw a NotFoundException", () => {
          return expect(
            middleware.use(
              express.request({
                params: { user: user.id, post: attempt },
              }) as unknown as Request,
              express.response() as unknown as Response,
              () => {},
            ),
          ).rejects.toMatchError(NotFoundException, {
            message: `Could not find Post with id ${attempt}`,
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

  describe("Scope Accessor Functionality", () => {
    describe("Given scope accessor with canAccess returning true", () => {
      let scopedMiddleware: RouteModelBindingMiddleware
      let mockAccessor: { canAccess: jest.Mock }

      beforeEach(async () => {
        mockAccessor = { canAccess: jest.fn().mockReturnValue(true) }
        const ds = await managedDatasourceInstance(["e2e/app/**/*.entity.ts"])
        scopedMiddleware = await createMiddleware(
          ds,
          { defaultResolver: DEFAULT_RESOLVER },
          mockAccessor,
        )

        await ds.getRepository(User).save([user])
        await ds.getRepository(Post).save([post])
      })

      it("should store entity on req.routeModels", (done) => {
        const request = express.request({
          params: { user: user.id },
        })

        void scopedMiddleware.use(
          request as unknown as Request,
          express.response() as unknown as Response,
          () => {
            expect(request).toHaveProperty("routeModels.user", user)
            done()
          },
        )
      })
    })

    describe("Given scope accessor with deny: 404 and canAccess returning false", () => {
      let scopedMiddleware: RouteModelBindingMiddleware
      let mockAccessor: { canAccess: jest.Mock }

      beforeEach(async () => {
        mockAccessor = { canAccess: jest.fn().mockReturnValue(false) }
        const ds = await managedDatasourceInstance(["e2e/app/**/*.entity.ts"])
        scopedMiddleware = await createMiddleware(
          ds,
          {
            defaultResolver: DEFAULT_RESOLVER,
            scope: { accessor: class {} as any, deny: 404 },
          },
          mockAccessor,
        )

        await ds.getRepository(User).save([user])
      })

      it("should throw NotFoundException", () => {
        return expect(
          scopedMiddleware.use(
            express.request({
              params: { user: user.id },
            }) as unknown as Request,
            express.response() as unknown as Response,
            () => {},
          ),
        ).rejects.toMatchError(NotFoundException, {
          message: `Could not find User with id ${user.id}`,
        })
      })
    })

    describe("Given scope accessor with deny: 403 and canAccess returning false", () => {
      let scopedMiddleware: RouteModelBindingMiddleware
      let mockAccessor: { canAccess: jest.Mock }

      beforeEach(async () => {
        mockAccessor = { canAccess: jest.fn().mockReturnValue(false) }
        const ds = await managedDatasourceInstance(["e2e/app/**/*.entity.ts"])
        scopedMiddleware = await createMiddleware(
          ds,
          {
            defaultResolver: DEFAULT_RESOLVER,
            scope: { accessor: class {} as any, deny: 403 },
          },
          mockAccessor,
        )

        await ds.getRepository(User).save([user])
      })

      it("should throw ForbiddenException", () => {
        return expect(
          scopedMiddleware.use(
            express.request({
              params: { user: user.id },
            }) as unknown as Request,
            express.response() as unknown as Response,
            () => {},
          ),
        ).rejects.toMatchError(ForbiddenException, {
          message: `Access denied to User with id ${user.id}`,
        })
      })
    })

    describe("Given scope accessor with no explicit deny and canAccess returning false", () => {
      let scopedMiddleware: RouteModelBindingMiddleware
      let mockAccessor: { canAccess: jest.Mock }

      beforeEach(async () => {
        mockAccessor = { canAccess: jest.fn().mockReturnValue(false) }
        const ds = await managedDatasourceInstance(["e2e/app/**/*.entity.ts"])
        scopedMiddleware = await createMiddleware(
          ds,
          {
            defaultResolver: DEFAULT_RESOLVER,
            scope: { accessor: class {} as any },
          },
          mockAccessor,
        )

        await ds.getRepository(User).save([user])
      })

      it("should default to NotFoundException", () => {
        return expect(
          scopedMiddleware.use(
            express.request({
              params: { user: user.id },
            }) as unknown as Request,
            express.response() as unknown as Response,
            () => {},
          ),
        ).rejects.toMatchError(NotFoundException, {
          message: `Could not find User with id ${user.id}`,
        })
      })
    })

    describe("Given async accessor returning Promise<false>", () => {
      let scopedMiddleware: RouteModelBindingMiddleware
      let mockAccessor: { canAccess: jest.Mock }

      beforeEach(async () => {
        mockAccessor = {
          canAccess: jest.fn().mockResolvedValue(false),
        }
        const ds = await managedDatasourceInstance(["e2e/app/**/*.entity.ts"])
        scopedMiddleware = await createMiddleware(
          ds,
          {
            defaultResolver: DEFAULT_RESOLVER,
            scope: { accessor: class {} as any, deny: 404 },
          },
          mockAccessor,
        )

        await ds.getRepository(User).save([user])
      })

      it("should throw NotFoundException", () => {
        return expect(
          scopedMiddleware.use(
            express.request({
              params: { user: user.id },
            }) as unknown as Request,
            express.response() as unknown as Response,
            () => {},
          ),
        ).rejects.toMatchError(NotFoundException, {
          message: `Could not find User with id ${user.id}`,
        })
      })
    })

    describe("Given multi-param route with scope accessor", () => {
      let scopedMiddleware: RouteModelBindingMiddleware
      let mockAccessor: { canAccess: jest.Mock }

      beforeEach(async () => {
        mockAccessor = { canAccess: jest.fn().mockReturnValue(true) }
        const ds = await managedDatasourceInstance(["e2e/app/**/*.entity.ts"])
        scopedMiddleware = await createMiddleware(
          ds,
          { defaultResolver: DEFAULT_RESOLVER },
          mockAccessor,
        )

        await ds.getRepository(User).save([user])
        await ds.getRepository(Post).save([post])
      })

      it("should call canAccess once per resolved entity with correct context", (done) => {
        const request = express.request({
          params: { user: user.id, post: post.id },
        })

        void scopedMiddleware.use(
          request as unknown as Request,
          express.response() as unknown as Response,
          () => {
            expect(mockAccessor.canAccess).toHaveBeenCalledTimes(2)
            expect(mockAccessor.canAccess).toHaveBeenNthCalledWith(1, {
              entity: user,
              id: user.id,
              name: "user",
              req: request,
            })
            expect(mockAccessor.canAccess).toHaveBeenNthCalledWith(2, {
              entity: post,
              id: post.id,
              name: "post",
              req: request,
            })
            done()
          },
        )
      })
    })

    describe("Given multi-param route where user is allowed but post is denied", () => {
      let scopedMiddleware: RouteModelBindingMiddleware

      beforeEach(async () => {
        const accessor = {
          canAccess: jest
            .fn()
            .mockImplementation(
              (ctx: { name: string }): boolean => ctx.name !== "post",
            ),
        }
        const ds = await managedDatasourceInstance(["e2e/app/**/*.entity.ts"])
        scopedMiddleware = await createMiddleware(
          ds,
          {
            defaultResolver: DEFAULT_RESOLVER,
            scope: { accessor: class {} as any },
          },
          accessor,
        )

        await ds.getRepository(User).save([user])
        await ds.getRepository(Post).save([post])
      })

      it("should throw NotFoundException for the post", () => {
        return expect(
          scopedMiddleware.use(
            express.request({
              params: { user: user.id, post: post.id },
            }) as unknown as Request,
            express.response() as unknown as Response,
            () => {},
          ),
        ).rejects.toMatchError(NotFoundException, {
          message: `Could not find Post with id ${post.id}`,
        })
      })
    })

    describe("Given multi-param route where user is denied", () => {
      let scopedMiddleware: RouteModelBindingMiddleware
      let mockAccessor: { canAccess: jest.Mock }

      beforeEach(async () => {
        mockAccessor = { canAccess: jest.fn().mockReturnValue(false) }
        const ds = await managedDatasourceInstance(["e2e/app/**/*.entity.ts"])
        scopedMiddleware = await createMiddleware(
          ds,
          {
            defaultResolver: DEFAULT_RESOLVER,
            scope: { accessor: class {} as any },
          },
          mockAccessor,
        )

        await ds.getRepository(User).save([user])
        await ds.getRepository(Post).save([post])
      })

      it("should throw NotFoundException for the user and not check the post", () => {
        return expect(
          scopedMiddleware.use(
            express.request({
              params: { user: user.id, post: post.id },
            }) as unknown as Request,
            express.response() as unknown as Response,
            () => {},
          ),
        ).rejects.toMatchError(NotFoundException, {
          message: `Could not find User with id ${user.id}`,
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
