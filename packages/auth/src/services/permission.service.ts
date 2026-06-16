import { Injectable } from "@nestjs/common"

import { Account } from "../entities/account.entity"
import { PermissionDeniedException } from "../exceptions/permission-denied.exception"

/**
 * Service for checking and enforcing permissions on accounts.
 *
 * Supports permission strings in the format `action:resource` with wildcard matching:
 * - `*` → matches all permissions (wildcard)
 * - `*:resource` → matches any action on a specific resource
 * - `action:*` → matches a specific action on any resource
 *
 * @example
 * ```typescript
 * // Check if user has permission
 * if (permissionService.hasPermission(user, 'read:users')) {
 *   // allow access
 * }
 *
 * // Throw if permission is missing
 * permissionService.requirePermission(user, 'delete:users')
 * ```
 */
/**
 * Matches valid permission formats:
 * - `*` (matches all permissions)
 * - `name` (e.g. `admin` — single-segment, exact match only)
 * - `action:resource` (e.g. `read:users`)
 * - `*:resource` (e.g. `*:users`)
 * - `action:*` (e.g. `read:*`)
 */
const PERMISSION_FORMAT = /^(\*|[^:*]+|[^:*]+:[^:*]+|\*:[^:*]+|[^:*]+:\*)$/

@Injectable()
export class PermissionService {
  /**
   * Validates that a permission string matches an accepted format.
   * Throws on invalid formats — this is a programmer/data error.
   *
   * @param permission - The permission string to validate
   * @throws {Error} If the format is invalid
   */
  public static validateFormat(permission: string): void {
    if (!PERMISSION_FORMAT.test(permission)) {
      throw new Error(
        `Invalid permission format: "${permission}". ` +
          'Must be "*", "name", "action:resource", "*:resource", or "action:*".',
      )
    }
  }
  /**
   * Checks if an account has a specific permission.
   *
   * @param account - The authenticated entity to check
   * @param permission - The permission to check for
   * @returns true if the account has the permission, false otherwise
   */
  public hasPermission(account: Account, permission: string): boolean {
    const permissions = account.permissions ?? []
    return permissions.some((p) => this.matchesPermission(p, permission))
  }

  /**
   * Checks if an account has all of the specified permissions.
   *
   * @param account - The authenticated entity to check
   * @param permissions - The permissions to check for (AND logic)
   * @returns true if the account has all permissions, false otherwise
   */
  public hasAllPermissions(account: Account, permissions: string[]): boolean {
    return permissions.every((p) => this.hasPermission(account, p))
  }

  /**
   * Checks if an account has any of the specified permissions.
   *
   * @param account - The authenticated entity to check
   * @param permissions - The permissions to check for (OR logic)
   * @returns true if the account has at least one permission, false otherwise
   */
  public hasAnyPermission(account: Account, permissions: string[]): boolean {
    return permissions.some((p) => this.hasPermission(account, p))
  }

  /**
   * Requires an account to have a specific permission, throws if not.
   *
   * @param account - The authenticated entity to check
   * @param permission - The permission required
   * @throws {PermissionDeniedException} If the account lacks the permission
   */
  public requirePermission(account: Account, permission: string): void {
    if (!this.hasPermission(account, permission)) {
      throw new PermissionDeniedException(
        [permission],
        "all",
        account.id,
        account.permissions,
      )
    }
  }

  /**
   * Requires an account to have all specified permissions, throws if not.
   *
   * @param account - The authenticated entity to check
   * @param permissions - The permissions required (AND logic)
   * @throws {PermissionDeniedException} If the account lacks any permission
   */
  public requireAllPermissions(account: Account, permissions: string[]): void {
    const missing = permissions.filter((p) => !this.hasPermission(account, p))
    if (missing.length > 0) {
      throw new PermissionDeniedException(
        missing,
        "all",
        account.id,
        account.permissions,
      )
    }
  }

  /**
   * Requires an account to have at least one of the specified permissions.
   *
   * @param account - The authenticated entity to check
   * @param permissions - The permissions to check (OR logic)
   * @throws {PermissionDeniedException} If the account has none of the permissions
   */
  public requireAnyPermission(account: Account, permissions: string[]): void {
    if (permissions.length === 0) {
      throw new Error("requireAnyPermission() requires at least one permission")
    }

    if (!this.hasAnyPermission(account, permissions)) {
      throw new PermissionDeniedException(
        permissions,
        "any",
        account.id,
        account.permissions,
      )
    }
  }

  /**
   * Checks if a granted permission matches a required permission.
   * Supports wildcards:
   * - `*` matches any permission
   * - `*:resource` matches any action on that resource
   * - `action:*` matches that action on any resource
   *
   * @param granted - The permission the account has
   * @param required - The permission being checked
   * @returns true if the granted permission satisfies the requirement
   */
  private matchesPermission(granted: string, required: string): boolean {
    PermissionService.validateFormat(granted)
    PermissionService.validateFormat(required)

    // Exact match
    if (granted === required) {
      return true
    }

    // Wildcard — matches all permissions
    if (granted === "*") {
      return true
    }

    // Parse action:resource format
    const [grantedAction, grantedResource] = granted.split(":")
    const [requiredAction, requiredResource] = required.split(":")

    // If required doesn't have a resource part, only exact or * matches
    if (!requiredResource) {
      return false
    }

    // *:resource matches any action on that resource
    if (grantedAction === "*" && grantedResource === requiredResource) {
      return true
    }

    // action:* matches that action on any resource
    if (grantedAction === requiredAction && grantedResource === "*") {
      return true
    }

    return false
  }
}
