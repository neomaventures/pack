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

import { setAccount } from "../account/account.slot"
import { RequiresAnyPermission } from "../decorators/requires-any-permission.decorator"
import { RequiresPermission } from "../decorators/requires-permission.decorator"
import { PermissionDeniedException } from "../exceptions/permission-denied.exception"
import { PermissionService } from "../services/permission.service"
import { fakeAccount } from "../testing"

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

  describe("When the request has no authenticated account", () => {
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

  describe("When the request has an authenticated account", () => {
    describe("Given a handler with no permission decorators", () => {
      it("should return true", () => {
        const ctx = executionContext(request, express.response(), {
          controller: NoPermissions,
          method: "handler",
        })

        cls.run(() => {
          setAccount(fakeAccount({ permissions: [] }))
          expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
        })
      })
    })

    describe("Given a handler requiring read:users and write:users", () => {
      it("should allow an account with both permissions", () => {
        const ctx = executionContext(request, express.response(), {
          controller: WithAndPermissions,
          method: "handler",
        })

        cls.run(() => {
          setAccount(
            fakeAccount({
              permissions: ["read:users", "write:users", "delete:users"],
            }),
          )
          expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
        })
      })

      it("should deny an account missing write:users", () => {
        const ctx = executionContext(request, express.response(), {
          controller: WithAndPermissions,
          method: "handler",
        })

        cls.run(() => {
          setAccount(fakeAccount({ permissions: ["read:users"] }))
          expect(() =>
            guard.canActivate(<ExecutionContext>ctx),
          ).toThrowMatching(PermissionDeniedException, {
            requiredPermissions: ["write:users"],
          })
        })
      })

      it("should allow an account with *", () => {
        const ctx = executionContext(request, express.response(), {
          controller: WithAndPermissions,
          method: "handler",
        })

        cls.run(() => {
          setAccount(fakeAccount({ permissions: ["*"] }))
          expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
        })
      })
    })

    describe("Given a handler requiring admin or delete:users", () => {
      it("should allow an account with delete:users", () => {
        const ctx = executionContext(request, express.response(), {
          controller: WithAnyPermissions,
          method: "handler",
        })

        cls.run(() => {
          setAccount(fakeAccount({ permissions: ["delete:users"] }))
          expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
        })
      })

      it("should deny an account with neither", () => {
        const ctx = executionContext(request, express.response(), {
          controller: WithAnyPermissions,
          method: "handler",
        })

        cls.run(() => {
          setAccount(fakeAccount({ permissions: ["read:users"] }))
          expect(() =>
            guard.canActivate(<ExecutionContext>ctx),
          ).toThrowMatching(PermissionDeniedException, {
            requiredPermissions: ["admin", "delete:users"],
          })
        })
      })
    })

    describe("Given a handler requiring read:users and (admin or write:users)", () => {
      it("should allow an account with read:users and write:users", () => {
        const ctx = executionContext(request, express.response(), {
          controller: WithBothPermissions,
          method: "handler",
        })

        cls.run(() => {
          setAccount(
            fakeAccount({ permissions: ["read:users", "write:users"] }),
          )
          expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
        })
      })

      it("should deny an account with read:users but neither admin nor write:users", () => {
        const ctx = executionContext(request, express.response(), {
          controller: WithBothPermissions,
          method: "handler",
        })

        cls.run(() => {
          setAccount(fakeAccount({ permissions: ["read:users"] }))
          expect(() =>
            guard.canActivate(<ExecutionContext>ctx),
          ).toThrowMatching(PermissionDeniedException, {
            requiredPermissions: ["admin", "write:users"],
          })
        })
      })

      it("should deny an account with admin but not read:users", () => {
        const ctx = executionContext(request, express.response(), {
          controller: WithBothPermissions,
          method: "handler",
        })

        cls.run(() => {
          setAccount(fakeAccount({ permissions: ["admin"] }))
          expect(() =>
            guard.canActivate(<ExecutionContext>ctx),
          ).toThrowMatching(PermissionDeniedException, {
            requiredPermissions: ["read:users"],
          })
        })
      })
    })

    describe("Given a controller requiring read:admin and a method requiring write:admin", () => {
      it("should allow an account with both read:admin and write:admin", () => {
        const ctx = executionContext(request, express.response(), {
          controller: ClassLevelPermissions,
          method: "restrictedHandler",
        })

        cls.run(() => {
          setAccount(
            fakeAccount({ permissions: ["read:admin", "write:admin"] }),
          )
          expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
        })
      })

      it("should deny an account with only read:admin", () => {
        const ctx = executionContext(request, express.response(), {
          controller: ClassLevelPermissions,
          method: "restrictedHandler",
        })

        cls.run(() => {
          setAccount(fakeAccount({ permissions: ["read:admin"] }))
          expect(() =>
            guard.canActivate(<ExecutionContext>ctx),
          ).toThrowMatching(PermissionDeniedException, {
            requiredPermissions: ["write:admin"],
          })
        })
      })

      it("should deny an account with only write:admin", () => {
        const ctx = executionContext(request, express.response(), {
          controller: ClassLevelPermissions,
          method: "restrictedHandler",
        })

        cls.run(() => {
          setAccount(fakeAccount({ permissions: ["write:admin"] }))
          expect(() =>
            guard.canActivate(<ExecutionContext>ctx),
          ).toThrowMatching(PermissionDeniedException, {
            requiredPermissions: ["read:admin"],
          })
        })
      })
    })

    describe("Given a controller requiring read:admin and a method with no additional permissions", () => {
      it("should allow an account with read:admin", () => {
        const ctx = executionContext(request, express.response(), {
          controller: ClassLevelPermissions,
          method: "handler",
        })

        cls.run(() => {
          setAccount(fakeAccount({ permissions: ["read:admin"] }))
          expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
        })
      })
    })

    describe("Given a controller and method both requiring read:admin", () => {
      it("should deduplicate and allow an account with read:admin", () => {
        const ctx = executionContext(request, express.response(), {
          controller: ClassLevelPermissions,
          method: "duplicateHandler",
        })

        cls.run(() => {
          setAccount(fakeAccount({ permissions: ["read:admin"] }))
          expect(guard.canActivate(<ExecutionContext>ctx)).toBeTrue()
        })
      })
    })
  })
})
