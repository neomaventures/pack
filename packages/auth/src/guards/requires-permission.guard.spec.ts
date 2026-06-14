import {
  executionContext,
  express,
  type MockRequest,
} from "@neomaventures/fixtures"
import { RequestContextModule } from "@neomaventures/request-context"
import { ExecutionContext, UnauthorizedException } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { Test, TestingModule } from "@nestjs/testing"
import { ClsService } from "nestjs-cls"

import * as fakes from "../../fixtures/fakes/principal"
import { RequiresAnyPermission } from "../decorators/requires-any-permission.decorator"
import { RequiresPermission } from "../decorators/requires-permission.decorator"
import { PermissionDeniedException } from "../exceptions/permission-denied.exception"
import { setPrincipal } from "../principal/principal.slot"
import { PermissionService } from "../services/permission.service"

import { RequiresPermissionGuard } from "./requires-permission.guard"

class NoPermissions {
  public handler(): void {}
}

class WithAndPermissions {
  @RequiresPermission("read:users", "write:users")
  public handler(): void {}
}

class WithAnyPermissions {
  @RequiresAnyPermission("admin", "delete:users")
  public handler(): void {}
}

class WithBothPermissions {
  @RequiresPermission("read:users")
  @RequiresAnyPermission("admin", "write:users")
  public handler(): void {}
}

@RequiresPermission("read:admin")
class ClassLevelPermissions {
  public handler(): void {}

  @RequiresPermission("write:admin")
  public restrictedHandler(): void {}

  @RequiresPermission("read:admin")
  public duplicateHandler(): void {}
}

describe("RequiresPermissionGuard", () => {
  let guard: RequiresPermissionGuard
  let cls: ClsService
  let request: MockRequest

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [RequestContextModule.forRoot()],
      providers: [RequiresPermissionGuard, Reflector, PermissionService],
    }).compile()

    guard = module.get(RequiresPermissionGuard)
    cls = module.get(ClsService)
    request = express.request()
  })

  describe("When the request has no authenticated principal", () => {
    it("should throw UnauthorizedException with the resource-aware message", () => {
      const requestUrl = "/protected/articles"
      const requestWithUrl = express.request({ url: requestUrl })
      const ctx = executionContext(requestWithUrl, express.response(), {
        controller: NoPermissions,
        method: "handler",
      })

      cls.run(() => {
        expect(() => guard.canActivate(<ExecutionContext>ctx)).toThrowMatching(
          UnauthorizedException,
          {
            message: `Unauthenticated, access to resource ${requestUrl} denied`,
          },
        )
      })
    })
  })

  describe("When the request has an authenticated principal", () => {
    describe("Given a handler with no permission decorators", () => {
      it("should return true", () => {
        const ctx = executionContext(request, express.response(), {
          controller: NoPermissions,
          method: "handler",
        })

        cls.run(() => {
          setPrincipal(fakes.principal({ permissions: [] }))
          expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
        })
      })
    })

    describe("Given a handler requiring read:users and write:users", () => {
      it("should allow a principal with both permissions", () => {
        const ctx = executionContext(request, express.response(), {
          controller: WithAndPermissions,
          method: "handler",
        })

        cls.run(() => {
          setPrincipal(
            fakes.principal({
              permissions: ["read:users", "write:users", "delete:users"],
            }),
          )
          expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
        })
      })

      it("should deny a principal missing write:users", () => {
        const ctx = executionContext(request, express.response(), {
          controller: WithAndPermissions,
          method: "handler",
        })

        cls.run(() => {
          setPrincipal(fakes.principal({ permissions: ["read:users"] }))
          expect(() =>
            guard.canActivate(<ExecutionContext>ctx),
          ).toThrowMatching(PermissionDeniedException, {
            requiredPermissions: ["write:users"],
          })
        })
      })

      it("should allow a principal with *", () => {
        const ctx = executionContext(request, express.response(), {
          controller: WithAndPermissions,
          method: "handler",
        })

        cls.run(() => {
          setPrincipal(fakes.principal({ permissions: ["*"] }))
          expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
        })
      })
    })

    describe("Given a handler requiring admin or delete:users", () => {
      it("should allow a principal with delete:users", () => {
        const ctx = executionContext(request, express.response(), {
          controller: WithAnyPermissions,
          method: "handler",
        })

        cls.run(() => {
          setPrincipal(fakes.principal({ permissions: ["delete:users"] }))
          expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
        })
      })

      it("should deny a principal with neither", () => {
        const ctx = executionContext(request, express.response(), {
          controller: WithAnyPermissions,
          method: "handler",
        })

        cls.run(() => {
          setPrincipal(fakes.principal({ permissions: ["read:users"] }))
          expect(() =>
            guard.canActivate(<ExecutionContext>ctx),
          ).toThrowMatching(PermissionDeniedException, {
            requiredPermissions: ["admin", "delete:users"],
          })
        })
      })
    })

    describe("Given a handler requiring read:users and (admin or write:users)", () => {
      it("should allow a principal with read:users and write:users", () => {
        const ctx = executionContext(request, express.response(), {
          controller: WithBothPermissions,
          method: "handler",
        })

        cls.run(() => {
          setPrincipal(
            fakes.principal({ permissions: ["read:users", "write:users"] }),
          )
          expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
        })
      })

      it("should deny a principal with read:users but neither admin nor write:users", () => {
        const ctx = executionContext(request, express.response(), {
          controller: WithBothPermissions,
          method: "handler",
        })

        cls.run(() => {
          setPrincipal(fakes.principal({ permissions: ["read:users"] }))
          expect(() =>
            guard.canActivate(<ExecutionContext>ctx),
          ).toThrowMatching(PermissionDeniedException, {
            requiredPermissions: ["admin", "write:users"],
          })
        })
      })

      it("should deny a principal with admin but not read:users", () => {
        const ctx = executionContext(request, express.response(), {
          controller: WithBothPermissions,
          method: "handler",
        })

        cls.run(() => {
          setPrincipal(fakes.principal({ permissions: ["admin"] }))
          expect(() =>
            guard.canActivate(<ExecutionContext>ctx),
          ).toThrowMatching(PermissionDeniedException, {
            requiredPermissions: ["read:users"],
          })
        })
      })
    })

    describe("Given a controller requiring read:admin and a method requiring write:admin", () => {
      it("should allow a principal with both read:admin and write:admin", () => {
        const ctx = executionContext(request, express.response(), {
          controller: ClassLevelPermissions,
          method: "restrictedHandler",
        })

        cls.run(() => {
          setPrincipal(
            fakes.principal({ permissions: ["read:admin", "write:admin"] }),
          )
          expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
        })
      })

      it("should deny a principal with only read:admin", () => {
        const ctx = executionContext(request, express.response(), {
          controller: ClassLevelPermissions,
          method: "restrictedHandler",
        })

        cls.run(() => {
          setPrincipal(fakes.principal({ permissions: ["read:admin"] }))
          expect(() =>
            guard.canActivate(<ExecutionContext>ctx),
          ).toThrowMatching(PermissionDeniedException, {
            requiredPermissions: ["write:admin"],
          })
        })
      })

      it("should deny a principal with only write:admin", () => {
        const ctx = executionContext(request, express.response(), {
          controller: ClassLevelPermissions,
          method: "restrictedHandler",
        })

        cls.run(() => {
          setPrincipal(fakes.principal({ permissions: ["write:admin"] }))
          expect(() =>
            guard.canActivate(<ExecutionContext>ctx),
          ).toThrowMatching(PermissionDeniedException, {
            requiredPermissions: ["read:admin"],
          })
        })
      })
    })

    describe("Given a controller requiring read:admin and a method with no additional permissions", () => {
      it("should allow a principal with read:admin", () => {
        const ctx = executionContext(request, express.response(), {
          controller: ClassLevelPermissions,
          method: "handler",
        })

        cls.run(() => {
          setPrincipal(fakes.principal({ permissions: ["read:admin"] }))
          expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
        })
      })
    })

    describe("Given a controller and method both requiring read:admin", () => {
      it("should deduplicate and allow a principal with read:admin", () => {
        const ctx = executionContext(request, express.response(), {
          controller: ClassLevelPermissions,
          method: "duplicateHandler",
        })

        cls.run(() => {
          setPrincipal(fakes.principal({ permissions: ["read:admin"] }))
          expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
        })
      })
    })
  })
})
