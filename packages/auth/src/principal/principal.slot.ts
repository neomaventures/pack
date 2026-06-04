import { createContextSlot } from "@neomaventures/request-context"

import { type Authenticatable } from "../interfaces/authenticatable.interface"

/**
 * Context slot for the authenticated principal, backed by `AsyncLocalStorage`
 * via `@neomaventures/request-context`.
 *
 * Exposes five access forms:
 * - `getPrincipal()` — plain accessor, works anywhere in the request lifecycle
 * - `setPrincipal()` — internal setter, used by authentication middlewares
 * - `Principal()` — param decorator for controller method parameters
 * - `CurrentPrincipal` — injection token for `@Inject()` in singleton services
 * - `principalProvider` — DI provider to register in the module
 *
 * @example Read the principal in a service
 * ```typescript
 * import { getPrincipal } from "@neomaventures/auth"
 *
 * const user = getPrincipal()
 * ```
 *
 * @example Use the param decorator in a controller
 * ```typescript
 * import { Principal } from "@neomaventures/auth"
 *
 * @Get("me")
 * public me(@Principal() principal: User): User {
 *   return principal
 * }
 * ```
 *
 * @example Inject into a singleton service
 * ```typescript
 * import { CurrentPrincipal, Authenticatable } from "@neomaventures/auth"
 *
 * @Injectable()
 * export class AuditService {
 *   public constructor(
 *     @Inject(CurrentPrincipal) private readonly principal: Authenticatable,
 *   ) {}
 * }
 * ```
 */
const principalSlot = createContextSlot<Authenticatable>(
  "@neomaventures/auth:principal",
)

export const getPrincipal = principalSlot.get
export const setPrincipal = principalSlot.set
export const Principal = principalSlot.param
export const CurrentPrincipal = principalSlot.token
export const principalProvider = principalSlot.provider
