import { faker } from "@faker-js/faker"
import { executionContext, express } from "@neomaventures/fixtures"
import {
  ForbiddenException,
  NotFoundException,
  type ExecutionContext,
  type Provider,
} from "@nestjs/common"
import { Test } from "@nestjs/testing"

import {
  ROUTE_MODEL_BINDING_CONFIG,
  SCOPE_ACCESSOR,
} from "../constants/injection-tokens"
import { type RouteModelBindingConfig } from "../interfaces/route-model-binding-config.interface"
import { type ScopeAccessor } from "../interfaces/scope-accessor.interface"

import { ScopeAccessGuard } from "./scope-access.guard"

const buildRequest = (
  models: Record<string, unknown>,
  meta: Record<string, { id: string; entityName: string }>,
): ReturnType<typeof express.request> =>
  express.request({
    params: {},
    routeModels: models,
    routeModelMeta: meta,
  })

const resolveGuard = async (
  accessor?: ScopeAccessor,
  config?: RouteModelBindingConfig,
): Promise<ScopeAccessGuard> => {
  const providers: Provider[] = [ScopeAccessGuard]

  if (accessor) {
    providers.push({ provide: SCOPE_ACCESSOR, useValue: accessor })
  }

  if (config) {
    providers.push({ provide: ROUTE_MODEL_BINDING_CONFIG, useValue: config })
  }

  const moduleRef = await Test.createTestingModule({ providers }).compile()
  return moduleRef.get(ScopeAccessGuard)
}

describe("ScopeAccessGuard", () => {
  const userId = faker.string.uuid()
  const postId = faker.string.uuid()
  const userEntity = { id: userId, username: faker.internet.username() }
  const postEntity = { id: postId, content: faker.lorem.sentence() }

  describe("Given no scope accessor is configured", () => {
    it("should allow access", async () => {
      const guard = await resolveGuard()
      const req = buildRequest(
        { user: userEntity },
        { user: { id: userId, entityName: "User" } },
      )

      const result = await guard.canActivate(
        executionContext(req) as ExecutionContext,
      )

      expect(result).toBeTrue()
    })
  })

  describe("Given no routeModels on request", () => {
    it("should allow access", async () => {
      const accessor: ScopeAccessor = {
        canAccess: jest.fn().mockReturnValue(true),
      }
      const guard = await resolveGuard(accessor)
      const req = express.request({ params: {} })

      const result = await guard.canActivate(
        executionContext(req) as ExecutionContext,
      )

      expect(result).toBeTrue()
    })
  })

  describe("Given scope accessor with canAccess returning true", () => {
    it("should allow access", async () => {
      const accessor: ScopeAccessor = {
        canAccess: jest.fn().mockReturnValue(true),
      }
      const guard = await resolveGuard(accessor)
      const req = buildRequest(
        { user: userEntity },
        { user: { id: userId, entityName: "User" } },
      )

      const result = await guard.canActivate(
        executionContext(req) as ExecutionContext,
      )

      expect(result).toBeTrue()
    })
  })

  describe("Given scope accessor with canAccess returning false", () => {
    it("should throw NotFoundException", async () => {
      const accessor: ScopeAccessor = {
        canAccess: jest.fn().mockReturnValue(false),
      }
      const guard = await resolveGuard(accessor)
      const req = buildRequest(
        { user: userEntity },
        { user: { id: userId, entityName: "User" } },
      )

      await expect(
        guard.canActivate(executionContext(req) as ExecutionContext),
      ).rejects.toMatchError(NotFoundException, {
        message: `Could not find User with id ${userId}`,
      })
    })

    describe("And deny is explicitly set to 404", () => {
      it("should throw NotFoundException", async () => {
        const accessor: ScopeAccessor = {
          canAccess: jest.fn().mockReturnValue(false),
        }
        const guard = await resolveGuard(accessor, {
          scope: { accessor: class {} as any, deny: 404 },
        })
        const req = buildRequest(
          { user: userEntity },
          { user: { id: userId, entityName: "User" } },
        )

        await expect(
          guard.canActivate(executionContext(req) as ExecutionContext),
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
        const guard = await resolveGuard(accessor, {
          scope: { accessor: class {} as any, deny: 403 },
        })
        const req = buildRequest(
          { user: userEntity },
          { user: { id: userId, entityName: "User" } },
        )

        await expect(
          guard.canActivate(executionContext(req) as ExecutionContext),
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
      const guard = await resolveGuard(accessor)
      const req = buildRequest(
        { user: userEntity },
        { user: { id: userId, entityName: "User" } },
      )

      await expect(
        guard.canActivate(executionContext(req) as ExecutionContext),
      ).rejects.toMatchError(NotFoundException, {
        message: `Could not find User with id ${userId}`,
      })
    })
  })

  describe("Given a null entity in routeModels", () => {
    it("should skip it and allow access", async () => {
      const accessor: ScopeAccessor = {
        canAccess: jest.fn().mockReturnValue(true),
      }
      const guard = await resolveGuard(accessor)
      const req = buildRequest(
        { user: null },
        { user: { id: userId, entityName: "User" } },
      )

      const result = await guard.canActivate(
        executionContext(req) as ExecutionContext,
      )

      expect(result).toBeTrue()
    })

    it("should not call canAccess for the null entity", async () => {
      const accessor: ScopeAccessor = {
        canAccess: jest.fn().mockReturnValue(true),
      }
      const guard = await resolveGuard(accessor)
      const req = buildRequest(
        { user: null },
        { user: { id: userId, entityName: "User" } },
      )

      await guard.canActivate(executionContext(req) as ExecutionContext)

      expect(accessor.canAccess).not.toHaveBeenCalled()
    })

    describe("And another entity is denied", () => {
      it("should throw for the denied entity and never call canAccess for the null one", async () => {
        const accessor: ScopeAccessor = {
          canAccess: jest.fn().mockReturnValue(false),
        }
        const guard = await resolveGuard(accessor)
        const req = buildRequest(
          { user: null, post: postEntity },
          {
            user: { id: userId, entityName: "User" },
            post: { id: postId, entityName: "Post" },
          },
        )

        await expect(
          guard.canActivate(executionContext(req) as ExecutionContext),
        ).rejects.toMatchError(NotFoundException, {
          message: `Could not find Post with id ${postId}`,
        })

        expect(accessor.canAccess).toHaveBeenCalledTimes(1)
        expect(accessor.canAccess).toHaveBeenCalledWith({
          entity: postEntity,
          id: postId,
          name: "post",
          req,
        })
      })
    })
  })

  describe("Given multi-param route with scope accessor", () => {
    describe("And all entities are allowed", () => {
      it("should allow access and call canAccess per entity", async () => {
        const accessor: ScopeAccessor = {
          canAccess: jest.fn().mockReturnValue(true),
        }
        const guard = await resolveGuard(accessor)
        const req = buildRequest(
          { user: userEntity, post: postEntity },
          {
            user: { id: userId, entityName: "User" },
            post: { id: postId, entityName: "Post" },
          },
        )

        const result = await guard.canActivate(
          executionContext(req) as ExecutionContext,
        )

        expect(result).toBeTrue()
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
        const guard = await resolveGuard(accessor)
        const req = buildRequest(
          { user: userEntity, post: postEntity },
          {
            user: { id: userId, entityName: "User" },
            post: { id: postId, entityName: "Post" },
          },
        )

        await expect(
          guard.canActivate(executionContext(req) as ExecutionContext),
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
        const guard = await resolveGuard(accessor)
        const req = buildRequest(
          { user: userEntity, post: postEntity },
          {
            user: { id: userId, entityName: "User" },
            post: { id: postId, entityName: "Post" },
          },
        )

        await expect(
          guard.canActivate(executionContext(req) as ExecutionContext),
        ).rejects.toMatchError(NotFoundException, {
          message: `Could not find User with id ${userId}`,
        })
      })
    })
  })
})
