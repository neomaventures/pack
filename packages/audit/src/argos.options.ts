import { type Request } from "express"

/**
 * Injection token for {@link ArgosOptions}.
 *
 * Use this to inject the resolved options into your own providers:
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   public constructor(
 *     @Inject(ARGOS_OPTIONS) private readonly options: ArgosOptions,
 *   ) {}
 * }
 * ```
 */
export const ARGOS_OPTIONS = Symbol("ARGOS_OPTIONS")

/**
 * Options for configuring the {@link ArgosModule}.
 */
export interface ArgosOptions {
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
   * ArgosModule.forRoot({
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
