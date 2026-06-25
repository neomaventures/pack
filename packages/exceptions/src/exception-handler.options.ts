/**
 * Options for {@link ExceptionHandlerModule}.
 *
 * Currently the only option is `errorTemplates` — a global fallback map
 * consulted by {@link NeomaExceptionFilter} when no route-level
 * `@ErrorTemplate` metadata is reachable.
 */
export interface ExceptionHandlerOptions {
  /**
   * Global fallback error templates rendered when no route-level
   * `@ErrorTemplate` is reachable (middleware-thrown exceptions, unmatched
   * routes, or guards that throw before the internal metadata bridge runs).
   *
   * Keys are HTTP status codes; `default` is required when this option is
   * provided. Values starting with `/` trigger a 303 See Other redirect.
   *
   * Asymmetry note: route-level `@ErrorTemplate` keys by `err.name`; global
   * keys by HTTP status. See README "Resolution ladder".
   *
   * @example
   * ```typescript
   * ExceptionHandlerModule.forRoot({
   *   errorTemplates: {
   *     default: "errors/generic",
   *     404: "errors/404",
   *     500: "errors/server",
   *   },
   * })
   * ```
   */
  errorTemplates?: {
    default: string
    [status: number]: string
  }
}
