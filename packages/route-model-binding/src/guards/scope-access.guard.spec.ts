import { express } from "@neomaventures/fixtures"
import { ForbiddenException, NotFoundException } from "@nestjs/common"
import { type ExecutionContext } from "@nestjs/common"
import { faker } from "@faker-js/faker"
import { type Request } from "express"

import {
  ROUTE_MODEL_BINDING_CONFIG,
  SCOPE_ACCESSOR,
} from "../constants/injection-tokens"
import { type RouteModelBindingConfig } from "../interfaces/route-model-binding-config.interface"
import { type ScopeAccessor } from "../interfaces/scope-accessor.interface"

import { ScopeAccessGuard } from "./scope-access.guard"

const createExecutionContext = (req: unknown): ExecutionContext =>
  ({
    switchToHttp: (): { getRequest: () => unknown } => ({
      getRequest: (): unknown => req,
    }),
  }) as ExecutionContext

describe("ScopeAccessGuard", () => {
  const userId = faker.string.uuid()
  const postId = faker.string.uuid()
  const userEntity = { id: userId, username: faker.internet.username() }
  const postEntity = { id: postId, content: faker.lorem.sentence() }

  const buildRequest = (
    models: Record<string, unknown>,
    meta: Record<string, { id: string; entityName: string }>,
  ): unknown => {
    const req = express.request({ params: {} })
    ;(req as any).routeModels = models
    ;(req as any).routeModelMeta = meta
    return req
  }

  describe("Given no scope accessor is configured", () => {
    it("should allow access", async () => {
      const guard = new ScopeAccessGuard()
      const req = buildRequest(
        { user: userEntity },
        { user: { id: userId, entityName: "User" } },
      )

      const result = await guard.canActivate(createExecutionContext(req))

      expect(result).toBe(true)
    })
  })

  describe("Given no routeModels on request", () => {
    it("should allow access", async () => {
      const accessor: ScopeAccessor = {
        canAccess: jest.fn().mockReturnValue(true),
      }
      const guard = new ScopeAccessGuard(accessor)
      const req = express.request({ params: {} })

      const result = await guard.canActivate(
        createExecutionContext(req),
      )

      expect(result).toBe(true)
    })
  })

  describe("Given scope accessor with canAccess returning true", () => {
    it("should allow access", async () => {
      const accessor: ScopeAccessor = {
        canAccess: jest.fn().mockReturnValue(true),
      }
      const guard = new ScopeAccessGuard(accessor)
      const req = buildRequest(
        { user: userEntity },
        { user: { id: userId, entityName: "User" } },
      )

      const result = await guard.canActivate(createExecutionContext(req))

      expect(result).toBe(true)
    })
  })

  describe("Given scope accessor with canAccess returning false", () => {
    describe("And deny defaults to 404", () => {
      it("should throw NotFoundException", async () => {
        const accessor: ScopeAccessor = {
          canAccess: jest.fn().mockReturnValue(false),
        }
        const guard = new ScopeAccessGuard(accessor)
        const req = buildRequest(
          { user: userEntity },
          { user: { id: userId, entityName: "User" } },
        )

        await expect(
          guard.canActivate(createExecutionContext(req)),
        ).rejects.toMatchError(NotFoundException, {
          message: `Could not find User with id ${userId}`,
        })
      })
    })

    describe("And deny is 404", () => {
      it("should throw NotFoundException", async () => {
        const accessor: ScopeAccessor = {
          canAccess: jest.fn().mockReturnValue(false),
        }
        const config: RouteModelBindingConfig = {
          scope: { accessor: class {} as any, deny: 404 },
        }
        const guard = new ScopeAccessGuard(accessor, config)
        const req = buildRequest(
          { user: userEntity },
          { user: { id: userId, entityName: "User" } },
        )

        await expect(
          guard.canActivate(createExecutionContext(req)),
        ).rejects.toMatchError(NotFoundException, {
          message: `Could not find User with id ${userId}`,
        })
      })
    })

    describe("And deny is 403", () => {
      it("should throw ForbiddenException", async () => {
        const accessor: ScopeAccessor = {
          canAccess: jest.fn().mockReturnValue(false),
        }
        const config: RouteModelBindingConfig = {
          scope: { accessor: class {} as any, deny: 403 },
        }
        const guard = new ScopeAccessGuard(accessor, config)
        const req = buildRequest(
          { user: userEntity },
          { user: { id: userId, entityName: "User" } },
        )

        await expect(
          guard.canActivate(createExecutionContext(req)),
        ).rejects.toMatchError(ForbiddenException, {
          message: `Access denied to User with id ${userId}`,
        })
      })
    })
  })

  describe("Given async accessor returning Promise<false>", () => {
    it("should throw NotFoundException", async () => {
      const accessor: ScopeAccessor = {
        canAccess: jest.fn().mockResolvedValue(false),
      }
      const guard = new ScopeAccessGuard(accessor)
      const req = buildRequest(
        { user: userEntity },
        { user: { id: userId, entityName: "User" } },
      )

      await expect(
        guard.canActivate(createExecutionContext(req)),
      ).rejects.toMatchError(NotFoundException, {
        message: `Could not find User with id ${userId}`,
      })
    })
  })

  describe("Given multi-param route with scope accessor", () => {
    describe("And all entities are allowed", () => {
      it("should allow access and call canAccess per entity", async () => {
        const accessor: ScopeAccessor = {
          canAccess: jest.fn().mockReturnValue(true),
        }
        const guard = new ScopeAccessGuard(accessor)
        const req = buildRequest(
          { user: userEntity, post: postEntity },
          {
            user: { id: userId, entityName: "User" },
            post: { id: postId, entityName: "Post" },
          },
        )

        const result = await guard.canActivate(createExecutionContext(req))

        expect(result).toBe(true)
        expect(accessor.canAccess).toHaveBeenCalledTimes(2)
        expect(accessor.canAccess).toHaveBeenCalledWith({
          entity: userEntity,
          id: userId,
          name: "user",
          req,
        })
        expect(accessor.canAccess).toHaveBeenCalledWith({
          entity: postEntity,
          id: postId,
          name: "post",
          req,
        })
      })
    })

    describe("And user is allowed but post is denied", () => {
      it("should throw NotFoundException for the post", async () => {
        const accessor: ScopeAccessor = {
          canAccess: jest
            .fn()
            .mockImplementation(
              (ctx: { name: string }): boolean => ctx.name !== "post",
            ),
        }
        const guard = new ScopeAccessGuard(accessor)
        const req = buildRequest(
          { user: userEntity, post: postEntity },
          {
            user: { id: userId, entityName: "User" },
            post: { id: postId, entityName: "Post" },
          },
        )

        await expect(
          guard.canActivate(createExecutionContext(req)),
        ).rejects.toMatchError(NotFoundException, {
          message: `Could not find Post with id ${postId}`,
        })
      })
    })

    describe("And user is denied", () => {
      it("should throw NotFoundException for the user", async () => {
        const accessor: ScopeAccessor = {
          canAccess: jest.fn().mockReturnValue(false),
        }
        const guard = new ScopeAccessGuard(accessor)
        const req = buildRequest(
          { user: userEntity, post: postEntity },
          {
            user: { id: userId, entityName: "User" },
            post: { id: postId, entityName: "Post" },
          },
        )

        await expect(
          guard.canActivate(createExecutionContext(req)),
        ).rejects.toMatchError(NotFoundException, {
          message: `Could not find User with id ${userId}`,
        })
      })
    })
  })
})
