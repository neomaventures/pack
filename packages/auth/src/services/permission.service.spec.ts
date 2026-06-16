import { faker } from "@faker-js/faker"

import { Account } from "../entities/account.entity"
import { PermissionDeniedException } from "../exceptions/permission-denied.exception"

import { PermissionService } from "./permission.service"

describe("PermissionService", () => {
  let service: PermissionService

  beforeEach(() => {
    service = new PermissionService()
  })

  const createAccount = (permissions: string[] = []): Account => {
    const account = new Account()
    account.id = faker.string.uuid()
    account.email = faker.internet.email()
    account.permissions = permissions
    return account
  }

  describe("hasPermission()", () => {
    describe("When called with an account that has no permissions", () => {
      it("should return false for read:users", () => {
        const account = createAccount([])
        expect(service.hasPermission(account, "read:users")).toBe(false)
      })
    })

    describe("When called with an account that has undefined permissions", () => {
      it("should return false for read:users", () => {
        const account = new Account()
        account.id = faker.string.uuid()
        account.email = faker.internet.email()
        expect(service.hasPermission(account, "read:users")).toBe(false)
      })
    })

    describe("When called with an account that has read:users", () => {
      it("should return true for read:users", () => {
        const account = createAccount(["read:users"])
        expect(service.hasPermission(account, "read:users")).toBe(true)
      })

      it("should return false for write:users", () => {
        const account = createAccount(["read:users"])
        expect(service.hasPermission(account, "write:users")).toBe(false)
      })
    })

    describe("When called with an account that has *", () => {
      it("should return true for any permission", () => {
        const account = createAccount(["*"])
        expect(service.hasPermission(account, "read:users")).toBe(true)
        expect(service.hasPermission(account, "delete:posts")).toBe(true)
        expect(service.hasPermission(account, "admin")).toBe(true)
      })
    })

    describe("When called with an account that has *:users", () => {
      it("should return true for any action on users", () => {
        const account = createAccount(["*:users"])
        expect(service.hasPermission(account, "read:users")).toBe(true)
        expect(service.hasPermission(account, "write:users")).toBe(true)
        expect(service.hasPermission(account, "delete:users")).toBe(true)
      })

      it("should return false for other resources", () => {
        const account = createAccount(["*:users"])
        expect(service.hasPermission(account, "read:posts")).toBe(false)
      })
    })

    describe("When called with an account that has read:*", () => {
      it("should return true for read on any resource", () => {
        const account = createAccount(["read:*"])
        expect(service.hasPermission(account, "read:users")).toBe(true)
        expect(service.hasPermission(account, "read:posts")).toBe(true)
        expect(service.hasPermission(account, "read:comments")).toBe(true)
      })

      it("should return false for other actions", () => {
        const account = createAccount(["read:*"])
        expect(service.hasPermission(account, "write:users")).toBe(false)
      })
    })

    describe("When called with an account that has admin (single-segment)", () => {
      it("should return true for admin", () => {
        const account = createAccount(["admin"])
        expect(service.hasPermission(account, "admin")).toBe(true)
      })

      it("should return false for read:users", () => {
        const account = createAccount(["admin"])
        expect(service.hasPermission(account, "read:users")).toBe(false)
      })

      it("should be matched by *", () => {
        const account = createAccount(["*"])
        expect(service.hasPermission(account, "admin")).toBe(true)
      })
    })
  })

  describe("hasAllPermissions()", () => {
    describe("When called with an account that has all required permissions", () => {
      it("should return true", () => {
        const account = createAccount([
          "read:users",
          "write:users",
          "delete:users",
        ])
        expect(
          service.hasAllPermissions(account, ["read:users", "write:users"]),
        ).toBe(true)
      })
    })

    describe("When called with an account missing one permission", () => {
      it("should return false", () => {
        const account = createAccount(["read:users"])
        expect(
          service.hasAllPermissions(account, ["read:users", "write:users"]),
        ).toBe(false)
      })
    })

    describe("When called with an empty required permissions array", () => {
      it("should return true", () => {
        const account = createAccount([])
        expect(service.hasAllPermissions(account, [])).toBe(true)
      })
    })

    describe("When called with an account that has *", () => {
      it("should return true for any permissions", () => {
        const account = createAccount(["*"])
        expect(
          service.hasAllPermissions(account, [
            "read:users",
            "write:posts",
            "admin",
          ]),
        ).toBe(true)
      })
    })
  })

  describe("hasAnyPermission()", () => {
    describe("When called with an account that has one matching permission", () => {
      it("should return true", () => {
        const account = createAccount(["read:users"])
        expect(
          service.hasAnyPermission(account, ["read:users", "write:users"]),
        ).toBe(true)
      })
    })

    describe("When called with an account that has no matching permissions", () => {
      it("should return false", () => {
        const account = createAccount(["read:posts"])
        expect(
          service.hasAnyPermission(account, ["read:users", "write:users"]),
        ).toBe(false)
      })
    })

    describe("When called with an empty required permissions array", () => {
      it("should return false", () => {
        const account = createAccount(["read:users"])
        expect(service.hasAnyPermission(account, [])).toBe(false)
      })
    })
  })

  describe("requirePermission()", () => {
    describe("When called with an account that has the required permission", () => {
      it("should not throw", () => {
        const account = createAccount(["read:users"])
        expect(() =>
          service.requirePermission(account, "read:users"),
        ).not.toThrow()
      })
    })

    describe("When called with an account that lacks the required permission", () => {
      it("should throw PermissionDeniedException with context", () => {
        const account = createAccount(["read:posts"])
        expect(() =>
          service.requirePermission(account, "delete:users"),
        ).toThrowMatching(PermissionDeniedException, {
          requiredPermissions: ["delete:users"],
          identifier: account.id,
          permissions: ["read:posts"],
        })
      })
    })
  })

  describe("requireAllPermissions()", () => {
    describe("When called with an account that has all required permissions", () => {
      it("should not throw", () => {
        const account = createAccount(["read:users", "write:users"])
        expect(() =>
          service.requireAllPermissions(account, ["read:users", "write:users"]),
        ).not.toThrow()
      })
    })

    describe("When called with an account missing one permission", () => {
      it("should throw with the missing permission", () => {
        const account = createAccount(["read:users"])
        expect(() =>
          service.requireAllPermissions(account, ["read:users", "write:users"]),
        ).toThrowMatching(PermissionDeniedException, {
          requiredPermissions: ["write:users"],
          identifier: account.id,
          permissions: ["read:users"],
        })
      })
    })

    describe("When called with an account missing multiple permissions", () => {
      it("should throw with all missing permissions", () => {
        const account = createAccount(["delete:users"])
        expect(() =>
          service.requireAllPermissions(account, ["read:users", "write:users"]),
        ).toThrowMatching(PermissionDeniedException, {
          requiredPermissions: ["read:users", "write:users"],
          identifier: account.id,
          permissions: ["delete:users"],
        })
      })
    })
  })

  describe("requireAnyPermission()", () => {
    describe("When called with an account that has one matching permission", () => {
      it("should not throw", () => {
        const account = createAccount(["read:users"])
        expect(() =>
          service.requireAnyPermission(account, ["read:users", "write:users"]),
        ).not.toThrow()
      })
    })

    describe("When called with an account that has no matching permissions", () => {
      it("should throw with all required permissions", () => {
        const account = createAccount(["read:posts"])
        expect(() =>
          service.requireAnyPermission(account, ["read:users", "write:users"]),
        ).toThrowMatching(PermissionDeniedException, {
          requiredPermissions: ["read:users", "write:users"],
          identifier: account.id,
          permissions: ["read:posts"],
        })
      })
    })

    describe("When called with an empty required permissions array", () => {
      it("should throw an Error", () => {
        const account = createAccount(["read:users"])
        expect(() => service.requireAnyPermission(account, [])).toThrow(
          "requireAnyPermission() requires at least one permission",
        )
      })
    })
  })

  describe("validateFormat()", () => {
    it.each(["*", "admin", "read:users", "*:users", "read:*"])(
      "should accept valid format: %s",
      (permission) => {
        expect(() => PermissionService.validateFormat(permission)).not.toThrow()
      },
    )

    it.each(["", "read:users:admin", "read::users", ":users", "read:", "::"])(
      "should throw on invalid format: %s",
      (permission) => {
        expect(() => PermissionService.validateFormat(permission)).toThrow(
          "Invalid permission format",
        )
      },
    )
  })
})
