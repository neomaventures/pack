import { SetMetadata } from "@nestjs/common"

import type { FeatureOptions } from "../features.options"

/**
 * Metadata key used by the feature guard to read the flag + options.
 *
 * @internal Not part of the public API.
 */
export const FEATURE_KEY = "neoma:feature"

/**
 * Marks a controller or route handler as gated behind a feature flag.
 *
 * When the flag is `false` or absent from the resolved flag set, the route
 * returns HTTP 404 as if it does not exist. Consumers may override the
 * deny-path exception per route by supplying `options.onDeny`.
 *
 * When applied to both a controller and a handler, the handler-level
 * `@Feature` fully overrides the controller-level `@Feature` — including
 * `onDeny`. There is no field-level inheritance: a handler that supplies
 * only a flag does not inherit a class-level `onDeny`.
 *
 * @param flag - The feature flag name to check against the resolved flag set
 * @param options - Optional per-decorator configuration
 *
 * @example Default deny (404)
 * ```typescript
 * @Feature("UPLOAD_BANK_STATEMENT")
 * ```
 *
 * @example Custom deny exception
 * ```typescript
 * @Feature("CHECKOUT_V2", {
 *   onDeny: (req) =>
 *     new ForbiddenException({
 *       message: "Checkout disabled",
 *       requestId: req.headers["x-request-id"],
 *     }),
 * })
 * ```
 */
export function Feature(
  flag: string,
  options: FeatureOptions = {},
): ClassDecorator & MethodDecorator {
  return SetMetadata(FEATURE_KEY, { flag, ...options })
}
