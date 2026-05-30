import { type Request } from "express"

/**
 * Injection token for {@link AuditOptions}.
 *
 * Use this to inject the resolved options into your own providers:
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   public constructor(
 *     @Inject(AUDIT_OPTIONS) private readonly options: AuditOptions,
 *   ) {}
 * }
 * ```
 */
export const AUDIT_OPTIONS = Symbol("AUDIT_OPTIONS")

/**
 * Options for configuring the {@link AuditModule}.
 */
export interface AuditOptions {
  /**
   * The actor string used when `resolveActor` is not defined or returns
   * `null`/`undefined`.
   *
   * @default "system"
   */
  defaultActor?: string

  /**
   * Extracts the actor string from the incoming request.
   *
   * The returned value is stored in AsyncLocalStorage for the
   * duration of the request. If the function returns `null` or
   * `undefined`, the actor falls back to {@link defaultActor}.
   *
   * @param req - The Express request object
   * @returns The actor string, or null/undefined to use the default
   *
   * @example
   * ```typescript
   * AuditModule.forRoot({
   *   resolveActor: (req) => req.principal
   *     ? `principal:${req.principal.id}`
   *     : null,
   * })
   * ```
   */
  resolveActor?: (
    req: Request,
  ) => string | null | undefined | Promise<string | null | undefined>
}
