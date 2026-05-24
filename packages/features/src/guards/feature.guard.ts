import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
  Scope,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import type { Request } from "express"

import { FEATURE_KEY } from "../decorators/feature.decorator"
import { type FeatureOnDeny } from "../features.options"
import { FeaturesService } from "../services/features.service"

interface FeatureMetadata {
  flag: string
  onDeny?: FeatureOnDeny
}

/**
 * Guard that enforces feature flag gating.
 *
 * Reads the `@Feature` metadata from the handler or controller via the
 * `Reflector` and delegates the admit decision to the request-scoped
 * `FeaturesService`. Throws `NotFoundException` by default, or the value
 * returned by the decorator's `onDeny` factory when one is supplied
 * (fail-closed). Routes without `@Feature` metadata are allowed through
 * unconditionally.
 *
 * Handler-level metadata takes priority over class-level metadata. The
 * guard itself is request-scoped so it can accept `FeaturesService` as a
 * direct constructor dependency — both share the same request-scoped DI
 * subtree.
 *
 * @internal Registered globally via `APP_GUARD` -- not exported.
 */
@Injectable({ scope: Scope.REQUEST })
export class FeatureGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    private readonly features: FeaturesService,
  ) {}

  /**
   * Checks whether the requested route's feature flag is enabled.
   *
   * @param context - The current execution context
   * @returns `true` if the route is allowed
   * @throws `NotFoundException` by default when the feature flag is
   *   disabled or missing from both the static map and the resolver's
   *   returned map. When the decorator supplied an `onDeny` factory, the
   *   value it returns is thrown instead — whatever it is. The consumer's
   *   exception filter is responsible for handling it.
   */
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<FeatureMetadata>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    )

    if (!metadata) {
      return true
    }

    const enabled = await this.features.isEnabled(metadata.flag)
    if (enabled) {
      return true
    }

    const req = context.switchToHttp().getRequest<Request>()
    throw metadata.onDeny?.(req) ?? new NotFoundException()
  }
}
