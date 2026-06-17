import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"

import { getAccount } from "../account/account.slot"
import { REQUIRED_ANY_PERMISSIONS_KEY } from "../decorators/requires-any-permission.decorator"
import { REQUIRED_PERMISSIONS_KEY } from "../decorators/requires-permission.decorator"
import { type Account } from "../entities/account.entity"
import { PermissionService } from "../services/permission.service"

import { buildUnauthenticatedMessage } from "./unauthenticated-message"

/**
 * Guard that enforces permission-based authorization.
 *
 * This guard:
 * 1. Checks for an authenticated account (throws 401 if missing)
 * 2. Checks required permissions based on metadata from decorators:
 *    - `@RequiresPermission()` - requires ALL permissions (AND logic)
 *    - `@RequiresAnyPermission()` - requires ANY permission (OR logic)
 *
 * @throws {UnauthorizedException} If no authenticated account exists
 * @throws {PermissionDeniedException} If the account lacks required permissions
 */
@Injectable()
export class RequiresPermissionGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Validates authentication and authorization for the current request.
   *
   * @param context - Execution context providing access to the request
   * @returns true if authorized
   * @throws {UnauthorizedException} If not authenticated
   * @throws {PermissionDeniedException} If permission check fails
   */
  public canActivate(context: ExecutionContext): boolean {
    const account = getAccount<Account>()

    // Check authentication first
    if (!account) {
      throw new UnauthorizedException(buildUnauthenticatedMessage(context))
    }

    // Get required permissions from metadata (AND logic), merging class + method
    const requiredAll = [
      ...new Set(
        this.reflector.getAllAndMerge<string[]>(REQUIRED_PERMISSIONS_KEY, [
          context.getHandler(),
          context.getClass(),
        ]) ?? [],
      ),
    ]

    // Get required any permissions from metadata (OR logic), merging class + method
    const requiredAny = [
      ...new Set(
        this.reflector.getAllAndMerge<string[]>(REQUIRED_ANY_PERMISSIONS_KEY, [
          context.getHandler(),
          context.getClass(),
        ]) ?? [],
      ),
    ]

    // Check AND permissions
    if (requiredAll?.length) {
      this.permissionService.requireAllPermissions(account, requiredAll)
    }

    // Check OR permissions
    if (requiredAny?.length) {
      this.permissionService.requireAnyPermission(account, requiredAny)
    }

    return true
  }
}
